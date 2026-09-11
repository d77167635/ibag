-- Iris report-product metadata is a governed publication definition, not financial evidence.
-- This migration intentionally creates schema only. It inserts no report definitions,
-- intelligence results, provider observations, or user-specific values.

create table if not exists public.iris_report_products (
  report_product_id text primary key,
  catalog_version text not null,
  version text not null,
  report_product_type text not null,
  report_product_name text not null,
  report_product_description text not null,
  family text not null,
  output_type text not null,
  subscription_requirement text,
  beta_access_state text not null default 'available',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iris_report_products_beta_access_state_check
    check (beta_access_state in ('available', 'locked', 'unavailable', 'not_yet_implemented')),
  constraint iris_report_products_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.iris_report_product_dependencies (
  id uuid primary key default gen_random_uuid(),
  report_product_id text not null references public.iris_report_products(report_product_id) on delete cascade,
  catalog_version text not null,
  dependency_type text not null,
  dependency_key text not null,
  required boolean not null default true,
  rationale text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint iris_report_product_dependencies_type_check
    check (dependency_type in ('analysis_definition', 'feature', 'intelligence', 'evidence_key')),
  constraint iris_report_product_dependencies_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint iris_report_product_dependencies_unique
    unique (report_product_id, dependency_type, dependency_key)
);

alter table public.iris_report_products enable row level security;
alter table public.iris_report_product_dependencies enable row level security;

create policy iris_report_products_authenticated_select
  on public.iris_report_products
  for select
  using (auth.uid() is not null);

create policy iris_report_product_dependencies_authenticated_select
  on public.iris_report_product_dependencies
  for select
  using (auth.uid() is not null);

create index if not exists iris_report_products_catalog_version_idx
  on public.iris_report_products(catalog_version);

create index if not exists iris_report_products_active_idx
  on public.iris_report_products(active);

create index if not exists iris_report_product_dependencies_report_idx
  on public.iris_report_product_dependencies(report_product_id);

create index if not exists iris_report_product_dependencies_type_key_idx
  on public.iris_report_product_dependencies(dependency_type, dependency_key);
