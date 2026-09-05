-- Keep the common Iris provider-evidence mirror synchronized with the
-- specialized real Plaid raw evidence tables. No synthetic evidence is created.

create or replace function public.sync_iris_transaction_evidence_mirror()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  select pa.item_id into v_item_id
  from public.plaid_accounts pa
  where pa.id = new.account_id and pa.user_id = new.user_id;

  if v_item_id is null then return new; end if;

  if tg_op = 'UPDATE' and new.is_current = false then
    update public.plaid_raw_product_observations
      set is_current = false
      where product='transactions'
        and provenance->>'original_observation_id' = new.id::text;
    return new;
  end if;

  if tg_op = 'INSERT' and new.is_current = true and new.evidence_state='observed' then
    insert into public.plaid_raw_product_observations
      (user_id,item_id,product,raw_response,provider_object_id,acquired_at,effective_at,evidence_state,provenance,is_current)
    values
      (new.user_id,v_item_id,'transactions',new.raw_response,coalesce(new.provider_object_id,new.plaid_transaction_id),new.acquired_at,new.effective_at,'observed',
       jsonb_build_object('source','plaid_raw_transactions','mirrored_for_iris',true,'original_observation_id',new.id),true)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.sync_iris_balance_evidence_mirror()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_provider_object_id text;
begin
  select pa.item_id into v_item_id
  from public.plaid_accounts pa
  where pa.id = new.account_id and pa.user_id = new.user_id;

  if v_item_id is null then return new; end if;

  if tg_op = 'UPDATE' and new.is_current = false then
    update public.plaid_raw_product_observations
      set is_current = false
      where product='balance'
        and provenance->>'original_observation_id' = new.id::text;
    return new;
  end if;

  if tg_op = 'INSERT' and new.is_current = true and new.evidence_state='observed' then
    v_provider_object_id := coalesce(new.provider_object_id, (new.raw_response->>'account_id'), (select plaid_account_id from public.plaid_accounts where id=new.account_id));
    insert into public.plaid_raw_product_observations
      (user_id,item_id,product,raw_response,provider_object_id,acquired_at,effective_at,evidence_state,provenance,is_current)
    values
      (new.user_id,v_item_id,'balance',new.raw_response,v_provider_object_id,new.acquired_at,new.effective_at,'observed',
       jsonb_build_object('source','plaid_raw_balances','mirrored_for_iris',true,'original_observation_id',new.id),true)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- These triggers only mirror evidence already persisted by the provider sync.
drop trigger if exists trg_sync_iris_transaction_evidence on public.plaid_raw_transactions;
create trigger trg_sync_iris_transaction_evidence
after insert or update of is_current on public.plaid_raw_transactions
for each row execute function public.sync_iris_transaction_evidence_mirror();

drop trigger if exists trg_sync_iris_balance_evidence on public.plaid_raw_balances;
create trigger trg_sync_iris_balance_evidence
after insert or update of is_current on public.plaid_raw_balances
for each row execute function public.sync_iris_balance_evidence_mirror();
