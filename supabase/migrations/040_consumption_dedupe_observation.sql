alter table public.iris_product_consumption
  add column if not exists dedupe_observation_id uuid
  generated always as (coalesce(raw_observation_id, evidence_observation_id)) stored;

drop index if exists public.iris_product_consumption_dedupe_idx;

create unique index if not exists iris_product_consumption_dedupe_idx
  on public.iris_product_consumption(user_id, item_id, product, analysis_key, dedupe_observation_id);
