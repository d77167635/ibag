-- Iris source-field -> intelligence lineage population.
-- Evidence-only: every binding maps an already-registered exact provider field to
-- its owning evidence-intelligence family node. No financial values are created.

insert into public.iris_source_field_intelligence_bindings (
  source_field_id,
  intelligence_node_id,
  field_key,
  field_role,
  operation,
  operation_version,
  evidence_compatible,
  active,
  metadata
)
select
  s.id,
  s.family_node_id,
  s.field_key,
  s.field_role,
  'source_field_observation',
  'IRIS_SOURCE_FIELD_INTELLIGENCE_BRIDGE_V1',
  true,
  s.active,
  jsonb_build_object(
    'binding_basis', 'registered_source_field_family_node',
    'evidence_basis', 'observed_source_field_observation',
    'governance_version', 'IRIS_SOURCE_FIELD_INTELLIGENCE_BINDING_V1'
  )
from public.iris_intelligence_source_fields s
where s.active = true
on conflict (source_field_id, intelligence_node_id, operation, operation_version)
do update set
  field_key = excluded.field_key,
  field_role = excluded.field_role,
  evidence_compatible = excluded.evidence_compatible,
  active = excluded.active,
  metadata = excluded.metadata,
  updated_at = now();

-- Persist exact observation -> intelligence-node lineage. The observation is the
-- evidence source; the registered field and binding are governance metadata only.
insert into public.iris_field_lineage_edges (
  user_id,
  item_id,
  source_type,
  source_id,
  source_field_path,
  destination_type,
  destination_id,
  destination_field_path,
  edge_role,
  operation,
  operation_version,
  evidence_state,
  metadata
)
select
  o.user_id,
  o.item_id,
  'source_field_observation',
  o.id,
  o.field_path,
  'intelligence_node',
  b.intelligence_node_id,
  null,
  'source_field_to_intelligence',
  b.operation,
  b.operation_version,
  o.evidence_state,
  jsonb_build_object(
    'source_field_id', b.source_field_id,
    'field_key', b.field_key,
    'field_role', b.field_role,
    'provider', o.provider,
    'product', o.product,
    'observation_last_observed_at', o.last_observed_at,
    'bridge_version', 'IRIS_SOURCE_FIELD_INTELLIGENCE_BRIDGE_V1'
  )
from public.iris_source_field_observations o
join public.iris_intelligence_source_fields s
  on s.product = o.product
 and s.provider_path = o.field_path
 and coalesce(s.metadata->>'provider', '') = coalesce(o.provider, '')
join public.iris_source_field_intelligence_bindings b
  on b.source_field_id = s.id
 and b.active = true
 and b.evidence_compatible = true
where o.evidence_state = 'observed'
on conflict do nothing;

comment on table public.iris_source_field_intelligence_bindings is
  'Governed mappings from exact registered provider source fields to intelligence nodes. Bindings are not evidence and never create financial observations.';
