-- Historical itemGet metadata was incorrectly persisted as evidence_state=observed.
-- Preserve the metadata row but remove its evidence authority. A later successful
-- provider endpoint observation will create lifecycle_state=observed evidence.
UPDATE public.plaid_product_observations
SET evidence_state = 'insufficient_evidence'
WHERE is_current = true
  AND provider = 'plaid'
  AND lifecycle_state <> 'observed'
  AND evidence_state = 'observed';