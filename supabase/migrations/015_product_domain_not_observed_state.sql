-- Stage 2.6/2.7: absence of a requested product from Item metadata is
-- insufficient evidence of support or connection. Preserve that distinction.

ALTER TABLE public.plaid_product_observations DROP CONSTRAINT IF EXISTS plaid_product_observations_state_ck;
ALTER TABLE public.plaid_product_observations
  ADD CONSTRAINT plaid_product_observations_state_ck
  CHECK (lifecycle_state IN ('unsupported','available','authorized','observed','validated','fresh','stale','not_requested','not_connected','not_observed'));
