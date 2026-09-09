-- Iris source-field registry population.
-- Evidence-only: registers exact field definitions from already-observed provider JSON paths.
-- It does not create, transform, or alter financial observations.

with family_map(product, node_key) as (
  values
    ('auth','auth_evidence'),
    ('transactions','tx_evidence'),
    ('balance','balance_evidence'),
    ('identity','identity_evidence'),
    ('assets','assets_evidence'),
    ('liabilities','liability_evidence'),
    ('investments','investment_evidence'),
    ('statements','statement_evidence')
), observed_fields as (
  select
    s.provider,
    s.product,
    s.field_path,
    min(s.field_type) as field_type,
    min(s.first_observed_at) as first_observed_at,
    max(s.last_observed_at) as last_observed_at,
    sum(s.occurrence_count)::bigint as occurrence_count,
    count(*)::bigint as observation_rows,
    count(*) filter (where s.evidence_state = 'observed')::bigint as observed_rows
  from public.iris_source_field_observations s
  where s.evidence_state = 'observed'
  group by s.provider, s.product, s.field_path
), registry_rows as (
  select
    f.node_id as family_node_id,
    o.provider,
    o.product,
    o.field_path,
    o.field_type,
    o.first_observed_at,
    o.last_observed_at,
    o.occurrence_count,
    o.observation_rows,
    o.observed_rows
  from observed_fields o
  join family_map m on m.product = o.product
  join public.iris_intelligence_nodes f
    on f.key = m.node_key
   and f.node_type = 'data_family'
   and f.active = true
)
insert into public.iris_intelligence_source_fields (
  family_node_id,
  field_key,
  source_table,
  source_column,
  product,
  provider_path,
  exact_provider_field_name,
  field_role,
  protected,
  metadata,
  active
)
select
  r.family_node_id,
  'source_field:' || r.provider || ':' || r.product || ':' || md5(r.field_path),
  'plaid_raw_product_observations',
  'raw_response',
  r.product,
  r.field_path,
  r.field_path,
  'source',
  (
    r.field_path ~* '(access[_ .-]?token|refresh[_ .-]?token|client[_ .-]?secret|password|ssn|social[_ .-]?security|routing[_ .-]?number|account[_ .-]?number)'
  ),
  jsonb_build_object(
    'registry_version', 'IRIS_SOURCE_FIELD_REGISTRY_V1',
    'provider', r.provider,
    'product', r.product,
    'field_type', r.field_type,
    'first_observed_at', r.first_observed_at,
    'last_observed_at', r.last_observed_at,
    'occurrence_count', r.occurrence_count,
    'observation_rows', r.observation_rows,
    'observed_rows', r.observed_rows,
    'evidence_basis', 'observed_source_field_observations_only'
  ),
  true
from registry_rows r
on conflict (field_key) do update
set
  family_node_id = excluded.family_node_id,
  source_table = excluded.source_table,
  source_column = excluded.source_column,
  product = excluded.product,
  provider_path = excluded.provider_path,
  exact_provider_field_name = excluded.exact_provider_field_name,
  field_role = excluded.field_role,
  protected = excluded.protected,
  metadata = excluded.metadata,
  active = excluded.active;

comment on table public.iris_intelligence_source_fields is
  'Governed registry of exact provider source fields observed in real provider evidence. Registry metadata is not itself financial evidence.';
