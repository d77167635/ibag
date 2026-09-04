-- iBag commercial control plane for Plaid capability access.
-- This is configuration, not financial data. No user financial observations are created.

create table if not exists public.ibag_plans (
  plan_key text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ibag_plan_plaid_products (
  plan_key text not null references public.ibag_plans(plan_key) on delete cascade,
  product_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (plan_key, product_key)
);

create table if not exists public.ibag_user_plan_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_key text not null references public.ibag_plans(plan_key),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ibag_plaid_product_commercial_terms (
  product_key text primary key,
  billing_model text not null default 'included_unless_plaid_charges',
  plaid_price_cents bigint,
  user_price_cents bigint,
  price_unit text,
  pricing_status text not null default 'contract_dependent' check (pricing_status in ('contract_dependent', 'configured', 'not_billable')),
  pass_through_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ibag_plans enable row level security;
alter table public.ibag_plan_plaid_products enable row level security;
alter table public.ibag_user_plan_subscriptions enable row level security;
alter table public.ibag_plaid_product_commercial_terms enable row level security;

-- Backend service-role access is authoritative. No client-side policy is
-- granted here; user plan/product data must not be user-editable from the UI.

do $$
begin
  insert into public.ibag_plans(plan_key, name)
  values ('all_access', 'iBag All Access')
  on conflict (plan_key) do update set active = true;

  insert into public.ibag_plan_plaid_products(plan_key, product_key, enabled)
  values
    ('all_access','auth',true),
    ('all_access','signal',true),
    ('all_access','identity',true),
    ('all_access','balance',true),
    ('all_access','transfer',true),
    ('all_access','investments_move',true),
    ('all_access','protect',true),
    ('all_access','identity_verification',true),
    ('all_access','cash_advance_index',true),
    ('all_access','monitor',true),
    ('all_access','transactions',true),
    ('all_access','investments',true),
    ('all_access','liabilities',true),
    ('all_access','enrich',true),
    ('all_access','assets',true),
    ('all_access','income',true),
    ('all_access','statements',true),
    ('all_access','income_verification',true),
    ('all_access','underwriting',true),
    ('all_access','lendscore',true),
    ('all_access','core_exchange',true),
    ('all_access','app_directory',true),
    ('all_access','permissions_manager',true),
    ('all_access','layer',true),
    ('all_access','plaid_link',true)
  on conflict (plan_key, product_key) do update set enabled = true;

  insert into public.ibag_plaid_product_commercial_terms(product_key)
  select product_key from public.ibag_plan_plaid_products
  on conflict (product_key) do nothing;
end $$;

comment on table public.ibag_plans is 'iBag subscription plans controlling access to Plaid capabilities.';
comment on table public.ibag_plan_plaid_products is 'Plan-level Plaid product entitlement; product availability is separately determined by Plaid.';
comment on table public.ibag_user_plan_subscriptions is 'Authoritative user subscription/plan state used as an eligibility gate.';
comment on table public.ibag_plaid_product_commercial_terms is 'Commercial configuration; Plaid pricing is contract-dependent and never inferred from Item state.';
