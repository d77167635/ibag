create or replace function public.record_roundup_contribution(
  p_user_id uuid,
  p_account_id uuid,
  p_transaction_id uuid,
  p_provider_transaction_id text,
  p_calculation_version text,
  p_classification_version text,
  p_eligibility_evidence text,
  p_amount numeric,
  p_source_observation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.plaid_accounts a
    where a.id = p_account_id and a.user_id = p_user_id
  ) then
    raise exception 'ownership violation';
  end if;

  if not exists (
    select 1 from public.transactions t
    where t.id = p_transaction_id
      and t.account_id = p_account_id
      and t.user_id = p_user_id
      and t.is_active = true
      and t.transaction_class = 'purchase'
      and t.classification_evidence in ('observed', 'calculated')
  ) then
    raise exception 'transaction is not an eligible canonical purchase';
  end if;

  if p_source_observation_id is null then
    raise exception 'source observation is required';
  end if;

  if not exists (
    select 1
    from public.iris_source_field_observations s
    join public.plaid_raw_transactions rt
      on rt.id = s.raw_observation_id
     and rt.user_id = s.user_id
     and rt.account_id = p_account_id
     and rt.plaid_transaction_id = p_provider_transaction_id
     and rt.is_current = true
     and rt.evidence_state = 'observed'
    join public.plaid_accounts source_account
      on source_account.id = rt.account_id
     and source_account.item_id = s.item_id
     and source_account.user_id = s.user_id
    where s.id = p_source_observation_id
      and s.user_id = p_user_id
      and s.product = 'transactions'
  ) then
    raise exception 'source observation does not prove the eligible provider transaction lineage';
  end if;

  if p_amount <= 0 or p_amount >= 1 then
    raise exception 'invalid roundup contribution';
  end if;

  insert into public.roundup_contributions(
    user_id, account_id, transaction_id, provider_transaction_id,
    calculation_version, classification_version, eligibility_evidence,
    amount, source_observation_id
  )
  values (
    p_user_id, p_account_id, p_transaction_id, p_provider_transaction_id,
    p_calculation_version, p_classification_version, p_eligibility_evidence,
    p_amount, p_source_observation_id
  )
  on conflict (transaction_id, calculation_version) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.roundup_contributions
    where transaction_id = p_transaction_id
      and calculation_version = p_calculation_version;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.record_roundup_contribution(uuid, uuid, uuid, text, text, text, text, numeric, uuid) from public, anon, authenticated;
