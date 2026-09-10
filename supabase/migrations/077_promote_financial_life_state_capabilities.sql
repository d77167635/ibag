-- Promote the canonical financial-life state and relational ontology from
-- embedded emergent material into independently governed, executable capabilities.
-- These capabilities remain read-only and derive only from evidence-bound canonical transactions.

insert into public.iris_capability_contracts (
  capability_id, version, operator_id, operator_version,
  evidence_requirements, dependencies, validation_rules, output_type,
  recursive, cross_domain, active, output_contract, lineage_requirements,
  resource_limits, user_control
)
values
(
  'financial_life_state', '1.0.0', 'financial_life_state', '1.0.0',
  '["canonical_transactions","run_evidence","source_lineage"]'::jsonb,
  '[]'::jsonb,
  '["output_must_be_evidence_bounded","observed_financial_values_must_not_be_created"]'::jsonb,
  'financial_life_state', true, true, true,
  '{"type":"financial_life_state","evidence_state_policy":["CALCULATED","INSUFFICIENT_EVIDENCE"],"observed_output_forbidden":true}'::jsonb,
  '["run_evidence","source_lineage"]'::jsonb,
  '{"max_execution_time_ms":30000}'::jsonb,
  '{"user_controllable":true,"enabled_by_default":true}'::jsonb
),
(
  'relational_ontology', '1.0.0', 'relational_ontology', '1.0.0',
  '["canonical_transactions","run_evidence","source_lineage"]'::jsonb,
  '["financial_life_state"]'::jsonb,
  '["output_must_be_evidence_bounded","relationships_must_not_be_presented_as_causation"]'::jsonb,
  'relational_ontology', true, true, true,
  '{"type":"relational_ontology","evidence_state_policy":["CALCULATED","INSUFFICIENT_EVIDENCE"],"observed_output_forbidden":true}'::jsonb,
  '["run_evidence","source_lineage"]'::jsonb,
  '{"max_execution_time_ms":30000}'::jsonb,
  '{"user_controllable":true,"enabled_by_default":true}'::jsonb
)
on conflict (capability_id, version) do update set
  operator_id = excluded.operator_id,
  operator_version = excluded.operator_version,
  evidence_requirements = excluded.evidence_requirements,
  dependencies = excluded.dependencies,
  validation_rules = excluded.validation_rules,
  output_type = excluded.output_type,
  recursive = excluded.recursive,
  cross_domain = excluded.cross_domain,
  active = excluded.active,
  output_contract = excluded.output_contract,
  lineage_requirements = excluded.lineage_requirements,
  resource_limits = excluded.resource_limits,
  user_control = excluded.user_control;

update public.iris_capability_contracts
set dependencies = dependencies || '["financial_life_state","relational_ontology"]'::jsonb
where capability_id = 'emergent'
  and active = true
  and not (dependencies ? 'financial_life_state')
  and not (dependencies ? 'relational_ontology');

-- The second guard is intentionally separate so an existing partial state is repaired.
update public.iris_capability_contracts
set dependencies = case
  when dependencies ? 'financial_life_state' and not (dependencies ? 'relational_ontology')
    then dependencies || '["relational_ontology"]'::jsonb
  when dependencies ? 'relational_ontology' and not (dependencies ? 'financial_life_state')
    then dependencies || '["financial_life_state"]'::jsonb
  else dependencies
end
where capability_id = 'emergent'
  and active = true;
