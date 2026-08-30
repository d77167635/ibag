-- =====================================================================
-- Iris — Phase 1 Schema (Intelligence & Reporting Only, No Money Movement)
-- =====================================================================
-- CORE RULE ENFORCED BY THIS SCHEMA:
-- Every dollar figure the app shows must trace to a row in plaid_* mirror
-- tables (real Plaid API responses) or a deterministic calculation logged
-- in calculation_audit_log. Nothing in here is seed/demo/mock data.
-- Run this in the Supabase SQL editor, or via `supabase db push` if you
-- adopt the Supabase CLI later.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. USERS (mirrors auth.users, Supabase Auth is the source of truth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 2. PLAID ITEMS — one row per Plaid Link connection (institution)
-- ---------------------------------------------------------------------
create table if not exists public.plaid_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plaid_item_id text not null unique,
  plaid_access_token text not null, -- store encrypted at rest (Supabase Vault or app-layer envelope encryption)
  institution_id text,
  institution_name text,
  status text not null default 'active', -- active | error | pending_reauth
  last_webhook_code text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plaid_items enable row level security;

create policy "plaid_items_owner_all" on public.plaid_items
  for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3. PLAID ACCOUNTS — cards/accounts under each Item
-- ---------------------------------------------------------------------
create table if not exists public.plaid_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.plaid_items(id) on delete cascade,
  plaid_account_id text not null unique,
  name text not null,
  official_name text,
  mask text,
  type text,       -- depository | credit | loan | investment
  subtype text,     -- checking | credit card | ...
  created_at timestamptz not null default now()
);

alter table public.plaid_accounts enable row level security;

create policy "plaid_accounts_owner_all" on public.plaid_accounts
  for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. RAW PLAID MIRROR — untouched API responses, source of truth for audit
-- ---------------------------------------------------------------------
create table if not exists public.plaid_raw_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.plaid_accounts(id) on delete cascade,
  plaid_transaction_id text not null unique,
  raw_response jsonb not null, -- the full Plaid transaction object, verbatim
  fetched_at timestamptz not null default now()
);

alter table public.plaid_raw_transactions enable row level security;
create policy "plaid_raw_tx_owner_all" on public.plaid_raw_transactions
  for all using (auth.uid() = user_id);

create table if not exists public.plaid_raw_balances (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.plaid_accounts(id) on delete cascade,
  raw_response jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.plaid_raw_balances enable row level security;
create policy "plaid_raw_bal_owner_all" on public.plaid_raw_balances
  for all using (auth.uid() = user_id);

create table if not exists public.plaid_raw_liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.plaid_accounts(id) on delete cascade,
  raw_response jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.plaid_raw_liabilities enable row level security;
create policy "plaid_raw_liab_owner_all" on public.plaid_raw_liabilities
  for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5. NORMALIZED TRANSACTIONS — app-facing table, derived only from mirror
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.plaid_accounts(id) on delete cascade,
  raw_transaction_id uuid not null references public.plaid_raw_transactions(id),
  plaid_transaction_id text not null unique,
  amount numeric(12,2) not null,       -- Plaid convention: positive = money out
  iso_currency_code text default 'USD',
  merchant_name text,
  plaid_category_primary text,          -- Plaid PFC primary, e.g. FOOD_AND_DRINK
  plaid_category_detailed text,         -- Plaid PFC detailed, e.g. FOOD_AND_DRINK_RESTAURANTS
  posted_date date not null,
  pending boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "transactions_owner_all" on public.transactions
  for all using (auth.uid() = user_id);

create index if not exists idx_transactions_user_date on public.transactions(user_id, posted_date desc);
create index if not exists idx_transactions_account on public.transactions(account_id);

-- ---------------------------------------------------------------------
-- 6. DOMAIN / SUBDOMAIN / CATEGORY HIERARCHY (editable, versioned, queried)
-- ---------------------------------------------------------------------
create table if not exists public.domains (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,             -- e.g. 'cash_flow_spending'
  label text not null,                  -- e.g. 'Cash Flow & Spending'
  sort_order int not null default 0
);

create table if not exists public.subdomains (
  id uuid primary key default uuid_generate_v4(),
  domain_id uuid not null references public.domains(id) on delete cascade,
  key text not null,                    -- e.g. 'discretionary'
  label text not null,                  -- e.g. 'Discretionary'
  sort_order int not null default 0,
  unique(domain_id, key)
);

create table if not exists public.category_mapping (
  id uuid primary key default uuid_generate_v4(),
  subdomain_id uuid not null references public.subdomains(id) on delete cascade,
  plaid_category_detailed text not null unique -- many-to-one: Plaid PFC -> our subdomain
);

-- Domains/subdomains/categories are reference data, not per-user — readable by any authenticated user
alter table public.domains enable row level security;
alter table public.subdomains enable row level security;
alter table public.category_mapping enable row level security;

create policy "domains_read_all_authenticated" on public.domains
  for select using (auth.role() = 'authenticated');
create policy "subdomains_read_all_authenticated" on public.subdomains
  for select using (auth.role() = 'authenticated');
create policy "category_mapping_read_all_authenticated" on public.category_mapping
  for select using (auth.role() = 'authenticated');

-- Writes to hierarchy tables happen via service role (admin tooling), not end users.

-- ---------------------------------------------------------------------
-- 7. ROUND-UP SIMULATION ENGINE (Phase 1: projection only, nothing moves)
-- ---------------------------------------------------------------------

-- Running per-card round-up accrual. Updated by the backend after each
-- transaction sync — never written to directly by the client.
create table if not exists public.card_roundup_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.plaid_accounts(id) on delete cascade,
  accrued_unswept numeric(12,4) not null default 0, -- round-up total below $2 threshold
  lifetime_roundup_total numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique(account_id)
);

alter table public.card_roundup_ledger enable row level security;
create policy "card_roundup_ledger_owner_all" on public.card_roundup_ledger
  for all using (auth.uid() = user_id);

-- One row per user: the simulated, aggregate "ibag" balance across all cards.
-- Explicitly a projection — never a spendable balance in Phase 1.
create table if not exists public.virtual_ibag_balance (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  projected_balance numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.virtual_ibag_balance enable row level security;
create policy "virtual_ibag_balance_owner_all" on public.virtual_ibag_balance
  for all using (auth.uid() = user_id);

-- Every simulated sweep or held-sweep event, so the UI can explain
-- "why was this held" and so every ibag balance change is auditable.
create table if not exists public.roundup_sweep_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.plaid_accounts(id) on delete cascade,
  event_type text not null check (event_type in ('simulated_sweep', 'held_insufficient_balance')),
  amount numeric(12,2) not null default 2.00,
  available_balance_at_check numeric(12,2), -- Balance product snapshot used for the safety check
  safety_threshold numeric(12,2),
  created_at timestamptz not null default now()
);

alter table public.roundup_sweep_events enable row level security;
create policy "roundup_sweep_events_owner_all" on public.roundup_sweep_events
  for all using (auth.uid() = user_id);

create index if not exists idx_sweep_events_user on public.roundup_sweep_events(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 8. CALCULATION AUDIT LOG — every derived metric must log how it was computed
-- ---------------------------------------------------------------------
create table if not exists public.calculation_audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric_key text not null,             -- e.g. 'interest_cost_attribution', 'safe_to_spend'
  inputs jsonb not null,                -- exact rows/values used (transaction ids, balance snapshot, APR, etc.)
  result numeric(14,4),
  computed_at timestamptz not null default now()
);

alter table public.calculation_audit_log enable row level security;
create policy "calculation_audit_log_owner_all" on public.calculation_audit_log
  for all using (auth.uid() = user_id);

create index if not exists idx_audit_log_user_metric on public.calculation_audit_log(user_id, metric_key, computed_at desc);

-- ---------------------------------------------------------------------
-- 9. WEBHOOK EVENT LOG — raw Plaid webhook payloads, for async processing
-- ---------------------------------------------------------------------
create table if not exists public.plaid_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  plaid_item_id text,
  webhook_type text,
  webhook_code text,
  raw_payload jsonb not null,
  processed boolean not null default false,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- No RLS: this table is written/read only by the backend service role, never the client.
alter table public.plaid_webhook_events enable row level security;
create policy "webhook_events_service_role_only" on public.plaid_webhook_events
  for all using (auth.role() = 'service_role');

-- =====================================================================
-- Seed: Domain / Subdomain hierarchy (structure only — no transaction data)
-- =====================================================================
insert into public.domains (key, label, sort_order) values
  ('cash_flow_spending', 'Cash Flow & Spending', 1),
  ('debt_credit_health', 'Debt & Credit Health', 2),
  ('net_worth_growth', 'Net Worth & Growth', 3),
  ('cash_flow_safety', 'Cash Flow Safety', 4)
on conflict (key) do nothing;

insert into public.subdomains (domain_id, key, label, sort_order)
select d.id, s.key, s.label, s.sort_order
from public.domains d
join (values
  ('cash_flow_spending', 'recurring_subscriptions', 'Recurring & Subscriptions', 1),
  ('cash_flow_spending', 'discretionary', 'Discretionary', 2),
  ('cash_flow_spending', 'fixed_essential', 'Fixed/Essential', 3),
  ('debt_credit_health', 'revolving_debt', 'Revolving Debt', 1),
  ('debt_credit_health', 'interest_cost_attribution', 'Interest Cost Attribution', 2),
  ('debt_credit_health', 'utilization_trend', 'Utilization Trend', 3),
  ('net_worth_growth', 'liquid_assets', 'Liquid Assets', 1),
  ('net_worth_growth', 'investments', 'Investments', 2),
  ('net_worth_growth', 'projected_roundup_accumulation', 'Projected Round-Up Accumulation', 3),
  ('cash_flow_safety', 'safe_to_spend', 'Safe-to-Spend', 1),
  ('cash_flow_safety', 'overdraft_risk_forecast', 'Overdraft Risk Forecast', 2),
  ('cash_flow_safety', 'bill_due_date_collision', 'Bill Due-Date Collision Detection', 3)
) as s(domain_key, key, label, sort_order) on s.domain_key = d.key
on conflict (domain_id, key) do nothing;

-- Category mapping is intentionally left for the team to populate against
-- Plaid's full Personal Finance Category taxonomy (~100+ detailed values) —
-- see https://plaid.com/docs/api/products/transactions/#personal-finance-category
-- This is real taxonomy work, not something to auto-generate.
