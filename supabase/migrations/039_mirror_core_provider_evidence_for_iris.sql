-- Backfill only from existing real Plaid provider evidence.
-- No synthetic or seeded financial data is introduced.
-- Transactions and balances have specialized raw evidence tables; Iris also
-- requires a common provider-evidence mirror so consumption can reference a
-- concrete raw_observation_id without weakening the evidence contract.

insert into public.plaid_raw_product_observations
  (user_id,item_id,product,raw_response,provider_object_id,acquired_at,effective_at,evidence_state,provenance,is_current)
select
  t.user_id,
  a.item_id,
  'transactions',
  t.raw_response,
  coalesce(t.provider_object_id,t.plaid_transaction_id),
  t.acquired_at,
  t.effective_at,
  'observed',
  jsonb_build_object('source','plaid_raw_transactions','mirrored_for_iris',true,'original_observation_id',t.id),
  true
from public.plaid_raw_transactions t
join public.plaid_accounts a on a.id=t.account_id and a.user_id=t.user_id
where t.is_current=true and t.evidence_state='observed'
  and not exists (
    select 1 from public.plaid_raw_product_observations r
    where r.user_id=t.user_id and r.item_id=a.item_id and r.product='transactions'
      and r.provider_object_id=coalesce(t.provider_object_id,t.plaid_transaction_id)
      and r.is_current=true
  );

insert into public.plaid_raw_product_observations
  (user_id,item_id,product,raw_response,provider_object_id,acquired_at,effective_at,evidence_state,provenance,is_current)
select
  b.user_id,
  a.item_id,
  'balance',
  b.raw_response,
  coalesce(b.provider_object_id,a.plaid_account_id),
  b.acquired_at,
  b.effective_at,
  'observed',
  jsonb_build_object('source','plaid_raw_balances','mirrored_for_iris',true,'original_observation_id',b.id),
  true
from public.plaid_raw_balances b
join public.plaid_accounts a on a.id=b.account_id and a.user_id=b.user_id
where b.is_current=true and b.evidence_state='observed'
  and not exists (
    select 1 from public.plaid_raw_product_observations r
    where r.user_id=b.user_id and r.item_id=a.item_id and r.product='balance'
      and r.provider_object_id=coalesce(b.provider_object_id,a.plaid_account_id)
      and r.is_current=true
  );

create index if not exists plaid_raw_product_observations_iris_source_idx
  on public.plaid_raw_product_observations(user_id,item_id,product,provider_object_id)
  where is_current;
