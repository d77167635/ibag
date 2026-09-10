-- Complete the persisted Iris capability contract so runtime governance is
-- represented in durable data rather than being implied by executable code.
alter table public.iris_capability_contracts
  add column if not exists output_contract jsonb not null default '{}'::jsonb,
  add column if not exists lineage_requirements jsonb not null default '[]'::jsonb,
  add column if not exists resource_limits jsonb not null default '{}'::jsonb,
  add column if not exists user_control jsonb not null default '{}'::jsonb;

update public.iris_capability_contracts
set
  output_contract = case
    when jsonb_typeof(output_contract) = 'object' and output_contract <> '{}'::jsonb then output_contract
    else jsonb_build_object(
      'type', output_type,
      'evidence_state_policy', jsonb_build_array('CALCULATED','INFERRED','PREDICTED','SCENARIO','INSUFFICIENT_EVIDENCE'),
      'observed_output_forbidden', true
    )
  end,
  lineage_requirements = case
    when jsonb_typeof(lineage_requirements) = 'array' and jsonb_array_length(lineage_requirements) > 0 then lineage_requirements
    else jsonb_build_array('run_evidence','source_lineage')
  end,
  resource_limits = case
    when jsonb_typeof(resource_limits) = 'object' and resource_limits <> '{}'::jsonb then resource_limits
    else jsonb_build_object(
      'max_execution_time_ms', 120000,
      'max_graph_nodes', 10000,
      'max_graph_edges', 30000,
      'max_compositions', 5000,
      'max_investigations', 500
    )
  end,
  user_control = case
    when jsonb_typeof(user_control) = 'object' and user_control <> '{}'::jsonb then user_control
    else jsonb_build_object(
      'activation_source', 'iris_feature_registry',
      'activation_required', true,
      'entitlement_required', true,
      'missing_evidence_behavior', 'explain_limitation'
    )
  end;

alter table public.iris_capability_contracts
  add constraint iris_capability_contracts_output_contract_object
    check (jsonb_typeof(output_contract) = 'object'),
  add constraint iris_capability_contracts_lineage_requirements_array
    check (jsonb_typeof(lineage_requirements) = 'array'),
  add constraint iris_capability_contracts_resource_limits_object
    check (jsonb_typeof(resource_limits) = 'object'),
  add constraint iris_capability_contracts_user_control_object
    check (jsonb_typeof(user_control) = 'object');

create index if not exists idx_iris_capability_contracts_operator
  on public.iris_capability_contracts(active, operator_id, operator_version);
