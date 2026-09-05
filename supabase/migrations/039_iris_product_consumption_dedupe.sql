-- Make the consumption ledger idempotent for the generated raw-observation key.
-- This is intentionally a unique index rather than a second mutable dedupe column.
create unique index if not exists iris_product_consumption_dedupe_uidx
  on public.iris_product_consumption(user_id, item_id, product, analysis_key, dedupe_observation_id);
