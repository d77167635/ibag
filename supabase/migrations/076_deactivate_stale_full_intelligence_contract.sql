-- The aggregate Iris intelligence surface is orchestrated by the governed
-- capability graph; it is not an independently executable capability contract.
-- Retain the historical row for auditability, but prevent the stale contract
-- from being selected by production capability planning when its operator
-- identity/version does not match the current governed implementation.
update public.iris_capability_contracts
set active = false
where capability_id = 'iris.full_intelligence'
  and active = true
  and (operator_id <> 'emergent' or operator_version <> '1.1.0');
