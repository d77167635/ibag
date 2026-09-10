-- Expand each provider-observation evidence record into the exact current
-- transaction and balance observations that belong to the same Plaid Item.
-- This preserves the existing run-evidence identity model while making the
-- financial rows consumed by intelligence explicitly addressable by run.
create or replace function public.expand_iris_run_evidence_to_raw_financial_observations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  obs_item uuid;
begin
  if new.evidence_type <> 'provider_raw_observation' or new.raw_observation_id is null then
    return new;
  end if;

  select item_id into obs_item
  from public.plaid_raw_product_observations
  where id = new.raw_observation_id
    and user_id = new.user_id
    and is_current = true
    and evidence_state = 'observed';

  if obs_item is null then
    return new;
  end if;

  insert into public.iris_run_evidence
    (run_id,user_id,evidence_type,provider,product,raw_observation_id,effective_at,acquired_at,evidence_hash)
  select new.run_id,new.user_id,'provider_raw_transaction','plaid','transactions',t.id,t.effective_at,t.acquired_at,coalesce(t.observation_hash, md5(t.raw_response::text))
  from public.plaid_raw_transactions t
  join public.plaid_accounts a on a.id=t.account_id and a.user_id=t.user_id
  where t.user_id=new.user_id and a.item_id=obs_item and t.is_current=true and t.evidence_state='observed'
    and t.acquired_at <= coalesce((select evidence_boundary from public.iris_runs where id=new.run_id),new.acquired_at)
    and not exists (select 1 from public.iris_run_evidence e where e.run_id=new.run_id and e.raw_observation_id=t.id and e.evidence_type='provider_raw_transaction');

  insert into public.iris_run_evidence
    (run_id,user_id,evidence_type,provider,product,raw_observation_id,effective_at,acquired_at,evidence_hash)
  select new.run_id,new.user_id,'provider_raw_balance','plaid','balance',b.id,b.effective_at,b.acquired_at,coalesce(b.observation_hash, md5(b.raw_response::text))
  from public.plaid_raw_balances b
  join public.plaid_accounts a on a.id=b.account_id and a.user_id=b.user_id
  where b.user_id=new.user_id and a.item_id=obs_item and b.is_current=true and b.evidence_state='observed'
    and b.acquired_at <= coalesce((select evidence_boundary from public.iris_runs where id=new.run_id),new.acquired_at)
    and not exists (select 1 from public.iris_run_evidence e where e.run_id=new.run_id and e.raw_observation_id=b.id and e.evidence_type='provider_raw_balance');

  return new;
end;
$$;

drop trigger if exists trg_expand_iris_run_evidence_raw_financial on public.iris_run_evidence;
create trigger trg_expand_iris_run_evidence_raw_financial
after insert on public.iris_run_evidence
for each row execute function public.expand_iris_run_evidence_to_raw_financial_observations();

create index if not exists idx_iris_run_evidence_run_type_raw
  on public.iris_run_evidence(run_id,evidence_type,raw_observation_id);
