create or replace function public.record_iris_consumption_lineage()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  raw_id uuid;
  raw_ids jsonb := coalesce(new.details->'source_observation_ids','[]'::jsonb);
  source_kind text := coalesce(new.details->>'source_kind','plaid_raw_product_observations');
  source_user uuid;
  source_item uuid;
  source_exists boolean := false;
begin
  if jsonb_typeof(raw_ids) <> 'array' then
    raise exception 'INVALID_SOURCE_OBSERVATION_IDS';
  end if;
  if jsonb_array_length(raw_ids) = 0 and new.raw_observation_id is not null then
    raw_ids := jsonb_build_array(new.raw_observation_id::text);
  end if;
  if source_kind not in ('plaid_raw_product_observations','plaid_raw_transactions','plaid_raw_balances','plaid_raw_liabilities') then
    raise exception 'INVALID_SOURCE_KIND: %', source_kind;
  end if;

  if new.item_id is not null and not exists (
    select 1 from public.plaid_items i where i.id = new.item_id and i.user_id = new.user_id
  ) then
    raise exception 'CONSUMPTION_ITEM_OWNERSHIP_MISMATCH';
  end if;

  for raw_id in select value::text::uuid from jsonb_array_elements_text(raw_ids) loop
    source_exists := false;
    source_user := null;
    source_item := null;

    if source_kind = 'plaid_raw_product_observations' then
      select true, r.user_id, r.item_id into source_exists, source_user, source_item
      from public.plaid_raw_product_observations r where r.id = raw_id;
    elsif source_kind = 'plaid_raw_transactions' then
      select true, r.user_id, a.item_id into source_exists, source_user, source_item
      from public.plaid_raw_transactions r join public.plaid_accounts a on a.id = r.account_id
      where r.id = raw_id;
    elsif source_kind = 'plaid_raw_balances' then
      select true, r.user_id, a.item_id into source_exists, source_user, source_item
      from public.plaid_raw_balances r join public.plaid_accounts a on a.id = r.account_id
      where r.id = raw_id;
    elsif source_kind = 'plaid_raw_liabilities' then
      select true, r.user_id, a.item_id into source_exists, source_user, source_item
      from public.plaid_raw_liabilities r join public.plaid_accounts a on a.id = r.account_id
      where r.id = raw_id;
    end if;

    if not source_exists then
      raise exception 'LINEAGE_SOURCE_NOT_FOUND: %', raw_id;
    end if;
    if source_user is distinct from new.user_id then
      raise exception 'LINEAGE_SOURCE_USER_MISMATCH: %', raw_id;
    end if;
    if new.item_id is not null and source_item is distinct from new.item_id then
      raise exception 'LINEAGE_SOURCE_ITEM_MISMATCH: %', raw_id;
    end if;

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
$function$;