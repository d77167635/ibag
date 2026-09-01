-- Balance/limit data: available from Plaid's standard account object for
-- any linked item, no extra product required. Never persisted until now.
alter table public.plaid_accounts
  add column current_balance numeric,
  add column available_balance numeric,
  add column credit_limit numeric,
  add column balance_updated_at timestamptz;

-- Essential vs discretionary is a second, orthogonal classification axis
-- from the domain/subdomain hierarchy — tagged at the detailed-category
-- level for precision (e.g. groceries vs restaurants both sit under
-- Food & Drink, but only one is essential).
alter table public.category_mapping
  add column is_essential boolean not null default false;

-- Recurring transaction detection: a "series" is a set of transactions on
-- the same merchant with a consistent amount and interval. Detected by a
-- rule-based scan (documented in code), not claimed to be ML-driven.
create table public.recurring_series (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id),
  typical_amount numeric not null,
  interval_days integer not null,
  last_seen_date date not null,
  next_expected_date date not null,
  occurrence_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, merchant_id)
);

alter table public.recurring_series enable row level security;

create policy "recurring_series_owner_all" on public.recurring_series
  for all using (auth.uid() = user_id);
