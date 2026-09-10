-- Iris supervisory intelligence is a composition over every governed capability.
-- The aggregate remains the final synthesis node; it is not a bypass around
-- subordinate capability planning, evidence gating, or operator validation.

update public.iris_capability_contracts
set dependencies = to_jsonb(array[
  'temporal',
  'analysis',
  'behavioral',
  'pattern',
  'relationship',
  'anomaly',
  'causal',
  'predictive',
  'scenario',
  'decision',
  'recommendation',
  'outcome',
  'learning',
  'emergent'
]::text[])
where capability_id = 'iris.full_intelligence' and active = true;
