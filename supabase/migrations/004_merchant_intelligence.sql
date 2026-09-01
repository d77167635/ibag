-- Merchant intelligence layer: canonicalizes raw Plaid merchant/description
-- strings (which vary per transaction, e.g. "Uber 072515 SF**POOL**" vs
-- "Uber") into one stable merchant identity, with every raw variant kept
-- as an auditable alias rather than silently discarded.

create table public.merchants (
  id uuid primary key default uuid_generate_v4(),
  canonical_name text not null unique,
  created_at timestamptz not null default now()
);

create table public.merchant_aliases (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  raw_pattern text not null unique,
  created_at timestamptz not null default now()
);

alter table public.merchants enable row level security;
alter table public.merchant_aliases enable row level security;

-- Merchant identity isn't private user data — any authenticated user can
-- read the shared merchant directory. Writes only ever happen through the
-- backend's service-role client during classification.
create policy "merchants_read_authenticated" on public.merchants
  for select using (auth.role() = 'authenticated');

create policy "merchant_aliases_read_authenticated" on public.merchant_aliases
  for select using (auth.role() = 'authenticated');

-- Classification results, written per-transaction so every transaction
-- carries its resolved merchant and category-hierarchy placement alongside
-- Plaid's raw fields (which stay untouched for audit purposes).
alter table public.transactions
  add column merchant_id uuid references public.merchants(id),
  add column subdomain_id uuid references public.subdomains(id);

create index transactions_merchant_id_idx on public.transactions(merchant_id);
create index transactions_subdomain_id_idx on public.transactions(subdomain_id);
