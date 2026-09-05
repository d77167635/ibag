create or replace function public.record_iris_consumption_lineage()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  raw_id uuid;
  raw_ids jsonb := coalesce(new.details->'source_observation_ids','[]'::jsonb);
begin
  if jsonb_typeof(raw_ids) <> 'array' then raw_ids := '[]'::jsonb; end if;

  if jsonb_array_length(raw_ids) = 0 and new.raw_observation_id is not null then
    raw_ids := jsonb_build_array(new.raw_observation_id::text);
  end if;

  for raw_id in select value::text::uuid from jsonb_array_elements_text(raw_ids) loop
    insert into public.iris_data_lineage
      (user_id,item_id,source_type,source_id,destination_type,destination_id,direction,operation,evidence_state,occurred_at,metadata)
    values
      (new.user_id,new.item_id,'provider_raw_observation',raw_id,'iris_product_consumption',new.id,'forward','provider_to_intelligence','observed',new.consumed_at,coalesce(new.details,'{}'::jsonb))
    on conflict do nothing;

    insert into public.iris_data_lineage
      (user_id,item_id,source_type,source_id,destination_type,destination_id,direction,operation,evidence_state,occurred_at,metadata)
    values
      (new.user_id,new.item_id,'iris_product_consumption',new.id,'provider_raw_observation',raw_id,'reverse','intelligence_to_provider','observed',new.consumed_at,coalesce(new.details,'{}'::jsonb))
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

-- Replace the prior trigger function so every actually consumed raw observation
-- receives its own forward and reverse lineage edge. No synthetic consumption is created.
revoke all on function public.record_iris_consumption_lineage() from public;
grant execute on function public.record_iris_consumption_lineage() to service_role;
