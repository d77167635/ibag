-- Records which real provider product evidence was actually consumed by Iris.
-- A product is never considered consumed merely because it is available, consented,
-- authorized, billed, or observed. Consumption requires a concrete analysis path.
create table if not exists public.iris_product_consumption (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.plaid_items(id) on delete cascade,
  product text not null,
  analysis_key text not null,
  evidence_observation_id uuid references public.plaid_product_observations(id) on delete set null,
  raw_observation_id uuid references public.plaid_raw_product_observations(id) on delete set null,
  consumed_at timestamptz not null default now(),
  consumption_version text not null default 'IRIS_PRODUCT_CONSUMPTION_V1',
  details jsonb not null default '{}'::jsonb
);

create index if not exists iris_product_consumption_lookup_idx
  on public.iris_product_consumption(user_id, product, consumed_at desc);
create index if not exists iris_product_consumption_item_idx
  on public.iris_product_consumption(item_id, product, consumed_at desc);

alter table public.iris_product_consumption enable row level security;

create policy iris_product_consumption_select_own
  on public.iris_product_consumption
  for select
  using (auth.uid() = user_id);
