-- Core Plaid raw evidence tables must expose the same current-snapshot
-- semantics used by source-fidelity and intelligence certification.
alter table public.plaid_raw_balances
  add column if not exists is_current boolean not null default true;

alter table public.plaid_raw_liabilities
  add column if not exists is_current boolean not null default true;

update public.plaid_raw_balances set is_current = true where is_current is null;
update public.plaid_raw_liabilities set is_current = true where is_current is null;

create index if not exists plaid_raw_balances_current_idx
  on public.plaid_raw_balances(user_id, account_id, acquired_at desc)
  where is_current;

create index if not exists plaid_raw_liabilities_current_idx
  on public.plaid_raw_liabilities(user_id, account_id, acquired_at desc)
  where is_current;
