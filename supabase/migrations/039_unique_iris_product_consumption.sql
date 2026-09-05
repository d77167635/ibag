create unique index if not exists iris_product_consumption_dedupe_idx
  on public.iris_product_consumption(user_id, item_id, product, analysis_key, raw_observation_id);
