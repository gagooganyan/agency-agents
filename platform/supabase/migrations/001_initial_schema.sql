-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  kyc_status text not null default 'pending' check (kyc_status in ('pending', 'verified', 'rejected')),
  balance_cents integer not null default 0 check (balance_cents >= 0),
  country text,
  referral_code text unique default upper(substring(gen_random_uuid()::text, 1, 8)),
  two_fa_enabled boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- SMS ACTIVATIONS
create table public.sims (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  phone_number text not null,
  service text not null,
  country text not null,
  status text not null default 'waiting' check (status in ('waiting', 'received', 'cancelled', 'expired')),
  sms_code text,
  fivesim_order_id bigint,
  price_cents integer not null,
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  created_at timestamptz not null default now()
);

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('topup', 'purchase', 'refund')),
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  provider text,
  product_type text check (product_type in ('sms', 'card', 'esim', 'number')),
  product_id uuid,
  payment_method text check (payment_method in ('crypto', 'card')),
  external_id text,
  created_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY
alter table public.users enable row level security;
alter table public.sims enable row level security;
alter table public.transactions enable row level security;

-- users: can only read/update own row
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);

-- sims: own rows only
create policy "sims_select_own" on public.sims for select using (auth.uid() = user_id);
create policy "sims_insert_own" on public.sims for insert with check (auth.uid() = user_id);
create policy "sims_update_own" on public.sims for update using (auth.uid() = user_id);

-- transactions: own rows only
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);

-- trigger: auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Balance helper RPCs (called from lib/utils/balance.ts)
create or replace function increment_balance(user_id uuid, amount integer)
returns void language plpgsql security definer as $$
begin
  update public.users set balance_cents = balance_cents + amount where id = user_id;
end;
$$;

create or replace function decrement_balance(user_id uuid, amount integer)
returns void language plpgsql security definer as $$
begin
  update public.users
  set balance_cents = balance_cents - amount
  where id = user_id and balance_cents >= amount;
  if not found then
    raise exception 'Insufficient balance';
  end if;
end;
$$;
