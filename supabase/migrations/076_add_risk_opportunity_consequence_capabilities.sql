-- Iris governed higher-order intelligence capabilities.
-- Additive only; no financial data is created or modified.
insert into public.iris_capability_contracts (
  capability_id, version, operator_id, operator_version,
  evidence_requirements, dependencies, validation_rules, output_type,
  recursive, cross_domain, active,
  output_contract, lineage_requirements, resource_limits, user_control
) values
(
  'risk', '1.0.0', 'risk', '1.0.0',
  '["authorized_plaid_evidence","canonical_financial_model"]'::jsonb,
  '["analysis","behavioral","anomaly","predictive"]'::jsonb,
  '["user_isolation","lineage_present","evidence_state_valid"]'::jsonb,
  'risk', true, true, true,
  '{"type":"risk","evidence_state_policy":["CALCULATED","INFERRED","PREDICTED","SCENARIO","INSUFFICIENT_EVIDENCE"],"observed_output_forbidden":true}'::jsonb,
  '["run_evidence","source_lineage"]'::jsonb,
  '{"max_graph_edges":30000,"max_graph_nodes":10000,"max_compositions":5000,"max_investigations":500,"max_execution_time_ms":120000}'::jsonb,
  '{"activation_source":"iris_feature_registry","activation_required":true,"entitlement_required":true,"missing_evidence_behavior":"explain_limitation"}'::jsonb
),
(
  'opportunity', '1.0.0', 'opportunity', '1.0.0',
  '["authorized_plaid_evidence","canonical_financial_model"]'::jsonb,
  '["analysis","behavioral","scenario","recommendation"]'::jsonb,
  '["user_isolation","lineage_present","evidence_state_valid"]'::jsonb,
  'opportunity', true, true, true,
  '{"type":"opportunity","evidence_state_policy":["CALCULATED","INFERRED","PREDICTED","SCENARIO","INSUFFICIENT_EVIDENCE"],"observed_output_forbidden":true}'::jsonb,
  '["run_evidence","source_lineage"]'::jsonb,
  '{"max_graph_edges":30000,"max_graph_nodes":10000,"max_compositions":5000,"max_investigations":500,"max_execution_time_ms":120000}'::jsonb,
  '{"activation_source":"iris_feature_registry","activation_required":true,"entitlement_required":true,"missing_evidence_behavior":"explain_limitation"}'::jsonb
),
(
  'consequence', '1.0.0', 'consequence', '1.0.0',
  '["authorized_plaid_evidence","canonical_financial_model"]'::jsonb,
  '["risk","opportunity","scenario","decision"]'::jsonb,
  '["user_isolation","lineage_present","evidence_state_valid"]'::jsonb,
  'consequence', true, true, true,
  '{"type":"consequence","evidence_state_policy":["CALCULATED","INFERRED","PREDICTED","SCENARIO","INSUFFICIENT_EVIDENCE"],"observed_output_forbidden":true}'::jsonb,
  '["run_evidence","source_lineage"]'::jsonb,
  '{"max_graph_edges":30000,"max_graph_nodes":10000,"max_compositions":5000,"max_investigations":500,"max_execution_time_ms":120000}'::jsonb,
  '{"activation_source":"iris_feature_registry","activation_required":true,"entitlement_required":true,"missing_evidence_behavior":"explain_limitation"}'::jsonb
)
on conflict (capability_id) do update set
  version = excluded.version,
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