-- VIRTUAL CARDS (Wallester)
create table public.cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  wallester_card_id text unique not null,
  currency text not null check (currency in ('EUR', 'USD')),
  status text not null default 'active' check (status in ('active', 'frozen', 'closed')),
  balance_cents integer not null default 0,
  tariff text not null,
  last_four text,
  expiry_month integer,
  expiry_year integer,
  created_at timestamptz not null default now()
);

-- ESIM (Airalo)
create table public.esims (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  airalo_order_id text unique not null,
  iccid text,
  country text not null,
  package_id text not null,
  data_gb numeric(5,2) not null,
  qr_code text,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  expires_at timestamptz,
  price_cents integer not null,
  created_at timestamptz not null default now()
);

-- VIRTUAL NUMBERS (Twilio)
create table public.virtual_numbers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  twilio_sid text unique not null,
  number text not null,
  country text not null,
  monthly_price_cents integer not null,
  next_renewal_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

-- KYC DOCUMENTS
create table public.kyc_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  document_type text not null check (document_type in ('passport', 'id_card', 'driving_license')),
  front_url text not null,
  back_url text,
  selfie_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- RLS
alter table public.cards enable row level security;
alter table public.esims enable row level security;
alter table public.virtual_numbers enable row level security;
alter table public.kyc_documents enable row level security;

create policy "cards_own" on public.cards for all using (auth.uid() = user_id);
create policy "esims_own" on public.esims for all using (auth.uid() = user_id);
create policy "virtual_numbers_own" on public.virtual_numbers for all using (auth.uid() = user_id);
create policy "kyc_own" on public.kyc_documents for all using (auth.uid() = user_id);
