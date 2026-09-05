-- Persist the actual provider payload for Trial products before Iris can call them observed.
-- Availability/authorization alone never creates evidence.
create table if not exists public.plaid_raw_product_observations (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.plaid_items(id) on delete cascade,
  product text not null,
  raw_response jsonb not null,
  provider_object_id text not null,
  acquired_at timestamptz not null default now(),
  effective_at timestamptz,
  evidence_state text not null default 'observed',
  provenance jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  constraint plaid_raw_product_observations_evidence_ck check (evidence_state in ('observed','calculated','limited','insufficient_evidence'))
);

create index if not exists plaid_raw_product_observations_lookup_idx
  on public.plaid_raw_product_observations(user_id, item_id, product, acquired_at desc);

create index if not exists plaid_raw_product_observations_current_idx
  on public.plaid_raw_product_observations(user_id, item_id, product)
  where is_current;

alter table public.plaid_raw_product_observations enable row level security;
