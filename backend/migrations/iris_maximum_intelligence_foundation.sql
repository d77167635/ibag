-- Iris maximum-intelligence foundation: capability contracts + source-field universe.
-- Additive migration; preserves existing financial evidence and intelligence history.

create table if not exists public.iris_capability_contracts (
  id uuid primary key default gen_random_uuid(),
  capability_id text not null,
  version text not null,
  operator_id text not null,
  operator_version text not null,
  evidence_requirements jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '[]'::jsonb,
  output_type text not null,
  recursive boolean not null default false,
  cross_domain boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(capability_id, version)
);

create index if not exists idx_iris_capability_contracts_active
  on public.iris_capability_contracts(active, capability_id);

create table if not exists public.iris_intelligence_source_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  product text not null,
  item_id uuid,
  raw_observation_id uuid,
  field_path text not null,
  field_type text,
  value_hash text,
  occurrence_count bigint not null default 1,
  first_observed_at timestamptz,
  last_observed_at timestamptz,
  evidence_state text not null default 'observed',
  lineage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, product, item_id, raw_observation_id, field_path)
);

create index if not exists idx_iris_source_fields_user_product
  on public.iris_intelligence_source_fields(user_id, product, field_path);
create index if not exists idx_iris_source_fields_user_last_observed
  on public.iris_intelligence_source_fields(user_id, last_observed_at desc);

alter table public.iris_capability_contracts enable row level security;
alter table public.iris_capability_contracts force row level security;
alter table public.iris_intelligence_source_fields enable row level security;
alter table public.iris_intelligence_source_fields force row level security;

-- Capability contracts are server-authoritative. Authenticated clients receive no direct write path.
create policy iris_capability_contracts_read
  on public.iris_capability_contracts for select
  to authenticated
  using (true);

-- Source-field observations are authoritative evidence metadata and therefore server-written.
create policy iris_source_fields_read_own
  on public.iris_intelligence_source_fields for select
  to authenticated
  using (auth.uid() = user_id);
