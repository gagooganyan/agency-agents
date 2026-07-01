-- BUNDLE PURCHASES
create table public.bundle_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  plan_id text not null check (plan_id in ('privacy_pack')),
  price_cents integer not null,
  card_id uuid references public.cards(id),
  number_id uuid references public.virtual_numbers(id),
  esim_id uuid references public.esims(id),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

-- DISPOSABLE CARD COLUMNS
alter table public.cards
  add column if not exists is_disposable boolean not null default false,
  add column if not exists merchant_domain text,
  add column if not exists valid_until timestamptz;

-- RLS
alter table public.bundle_purchases enable row level security;
create policy "bundles_own" on public.bundle_purchases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INDEXES
create index if not exists idx_bundle_purchases_user_id on public.bundle_purchases(user_id);
create index if not exists idx_cards_user_id on public.cards(user_id);
create index if not exists idx_esims_user_id on public.esims(user_id);
create index if not exists idx_virtual_numbers_user_id on public.virtual_numbers(user_id);
