-- Durable source-field -> intelligence lineage trigger.
-- Every future source-field observation is connected to its governed intelligence
-- family node when an exact registered field/binding exists.

create or replace function public.record_source_field_intelligence_lineage()
returns trigger
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  mapping record;
begin
  if new.user_id is null or new.item_id is null or new.field_path is null then
    return new;
  end if;

  for mapping in
    select
      s.id as source_field_id,
      s.field_key,
      s.field_role,
      b.intelligence_node_id,
      b.operation,
      b.operation_version,
      b.evidence_compatible
    from public.iris_intelligence_source_fields s
    join public.iris_source_field_intelligence_bindings b
      on b.source_field_id = s.id
     and b.active = true
     and b.evidence_compatible = true
    where s.active = true
      and s.product = new.product
      and s.provider_path = new.field_path
      and coalesce(s.metadata->>'provider','') = coalesce(new.provider,'')
  loop
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
    values (
      new.user_id,
      new.item_id,
      'source_field_observation',
      new.id,
      new.field_path,
      'intelligence_node',
      mapping.intelligence_node_id,
      null,
      'source_field_to_intelligence',
      mapping.operation,
      mapping.operation_version,
      coalesce(new.evidence_state,'unknown'),
      jsonb_build_object(
        'source_field_id', mapping.source_field_id,
        'field_key', mapping.field_key,
        'field_role', mapping.field_role,
        'provider', new.provider,
        'product', new.product,
        'raw_observation_id', new.raw_observation_id,
        'bridge_version', 'IRIS_SOURCE_FIELD_INTELLIGENCE_BRIDGE_V2'
      )
    )
    on conflict do update set
      evidence_state = excluded.evidence_state,
      metadata = excluded.metadata;
  end loop;

  return new;
end;
$$;

revoke all on function public.record_source_field_intelligence_lineage() from public;
grant execute on function public.record_source_field_intelligence_lineage() to service_role;

drop trigger if exists trg_record_source_field_intelligence_lineage on public.iris_source_field_observations;
create trigger trg_record_source_field_intelligence_lineage
after insert or update of user_id,item_id,provider,product,field_path,evidence_state,raw_observation_id
on public.iris_source_field_observations
for each row execute function public.record_source_field_intelligence_lineage();

comment on function public.record_source_field_intelligence_lineage() is
  'Maintains durable exact source-field observation -> intelligence-node lineage. Registry bindings are governance metadata; only the source observation supplies evidence.';
