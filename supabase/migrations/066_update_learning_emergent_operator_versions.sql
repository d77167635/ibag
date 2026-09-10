-- Keep persisted capability contracts synchronized with the governed runtime
-- operators that now perform explicit server-authoritative promotion.
UPDATE public.iris_capability_contracts
SET operator_version = '1.1.0',
    version = '1.1.0'
WHERE active = true
  AND capability_id IN ('learning', 'emergent');
