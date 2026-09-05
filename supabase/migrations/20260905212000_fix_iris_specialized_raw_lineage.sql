-- Specialized Plaid evidence (transactions, balances, liabilities) lives in
-- dedicated raw tables rather than plaid_raw_product_observations. The Iris
-- consumption ledger must therefore not enforce a foreign key to the generic
-- raw-observation table for those products.
alter table public.iris_product_consumption
  drop constraint if exists iris_product_consumption_raw_observation_id_fkey;

create or replace function public.record_iris_consumption_lineage()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  raw_id uuid;
  raw_ids jsonb := coalesce(new.details->'source_observation_ids','[]'::jsonb);
  source_kind text := coalesce(new.details->>'source_kind','plaid_raw_product_observations');
begin
  if jsonb_typeof(raw_ids) <> 'array' then raw_ids := '[]'::jsonb; end if;
  if jsonb_array_length(raw_ids) = 0 and new.raw_observation_id is not null then
    raw_ids := jsonb_build_array(new.raw_observation_id::text);
  end if;

  if source_kind not in (
    'plaid_raw_product_observations',
    'plaid_raw_transactions',
    'plaid_raw_balances',
    'plaid_raw_liabilities'
  ) then
    source_kind := 'plaid_raw_product_observations';
  end if;

  for raw_id in select value::text::uuid from jsonb_array_elements_text(raw_ids) loop
    insert into public.iris_data_lineage
      (user_id,item_id,source_type,source_id,destination_type,destination_id,direction,operation,evidence_state,occurred_at,metadata)
    values
      (new.user_id,new.item_id,source_kind,raw_id,'iris_product_consumption',new.id,'forward','provider_to_intelligence','observed',new.consumed_at,coalesce(new.details,'{}'::jsonb))
    on conflict do nothing;

    insert into public.iris_data_lineage
      (user_id,item_id,source_type,source_id,destination_type,destination_id,direction,operation,evidence_state,occurred_at,metadata)
    values
      (new.user_id,new.item_id,'iris_product_consumption',new.id,source_kind,raw_id,'reverse','intelligence_to_provider','observed',new.consumed_at,coalesce(new.details,'{}'::jsonb))
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

revoke all on function public.record_iris_consumption_lineage() from public;
grant execute on function public.record_iris_consumption_lineage() to service_role;
