-- Iris field-level lineage: exact provider fields -> canonical fields -> execution/output references.
-- Evidence-only. This migration does not create financial facts or synthetic observations.

create table if not exists public.iris_field_lineage_edges (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.plaid_items(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  source_field_path text,
  destination_type text not null,
  destination_id uuid not null,
  destination_field_path text,
  edge_role text not null check (edge_role in ('provider_to_canonical','canonical_to_intelligence','source_field_to_intelligence','evidence_scope','intelligence_to_output')),
  operation text not null,
  operation_version text,
  evidence_state text not null default 'observed',
  run_id uuid,
  execution_id uuid,
  output_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists iris_field_lineage_source_idx
  on public.iris_field_lineage_edges(user_id,item_id,source_type,source_id,source_field_path,created_at desc);
create index if not exists iris_field_lineage_destination_idx
  on public.iris_field_lineage_edges(user_id,item_id,destination_type,destination_id,destination_field_path,created_at desc);
create index if not exists iris_field_lineage_run_idx
  on public.iris_field_lineage_edges(user_id,run_id,execution_id,created_at desc);

create unique index if not exists iris_field_lineage_edge_uidx
  on public.iris_field_lineage_edges(
    user_id,item_id,source_type,source_id,coalesce(source_field_path,''),
    destination_type,destination_id,coalesce(destination_field_path,''),
    edge_role,operation,coalesce(operation_version,'')
  );

alter table public.iris_field_lineage_edges enable row level security;
alter table public.iris_field_lineage_edges force row level security;
revoke all on table public.iris_field_lineage_edges from public;
grant select on public.iris_field_lineage_edges to authenticated;
grant select,insert,update,delete on public.iris_field_lineage_edges to service_role;

drop policy if exists iris_field_lineage_edges_read_own on public.iris_field_lineage_edges;
create policy iris_field_lineage_edges_read_own
  on public.iris_field_lineage_edges for select to authenticated
  using (auth.uid() = user_id);

-- Canonical transaction fields retain an explicit provider-raw identity. Record the
-- exact raw JSON field path only when that field is actually present in the provider
-- response. This establishes provider -> canonical lineage without inventing fields.
create or replace function public.record_transaction_field_lineage()
returns trigger
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  r jsonb;
  mapping record;
  path_exists boolean;
begin
  select raw_response into r
  from public.plaid_raw_transactions
  where id = new.raw_transaction_id
    and user_id = new.user_id;

  if r is null then
    return new;
  end if;

  for mapping in
    select * from (values
      ('amount','amount','canonical_amount'),
      ('merchant_name','merchant_name','canonical_merchant_name'),
      ('plaid_category_primary','category.primary','canonical_category_primary'),
      ('plaid_category_detailed','category.detailed','canonical_category_detailed'),
      ('posted_date','date','canonical_posted_date'),
      ('pending','pending','canonical_pending')
    ) as m(canonical_field, provider_path, operation)
  loop
    path_exists := case
      when mapping.provider_path like 'category.%'
        then jsonb_typeof(r->'category') = 'object'
             and r->'category' ? split_part(mapping.provider_path,'.',2)
      else r ? mapping.provider_path
    end;

    if path_exists then
      insert into public.iris_field_lineage_edges(
        user_id,item_id,source_type,source_id,source_field_path,
        destination_type,destination_id,destination_field_path,
        edge_role,operation,operation_version,evidence_state,metadata
      )
      values(
        new.user_id,
        (select item_id from public.plaid_accounts where id=new.account_id and user_id=new.user_id),
        'provider_raw_transaction',new.raw_transaction_id,mapping.provider_path,
        'canonical_transaction',new.id,mapping.canonical_field,
        'provider_to_canonical',mapping.operation,'transaction-canonical-v1','observed',
        jsonb_build_object('plaid_transaction_id',new.plaid_transaction_id)
      )
      on conflict do nothing;
    end if;
  end loop;

  -- Classification is a derived semantic field. Its lineage points to the canonical
  -- transaction rather than falsely claiming that Plaid directly observed the class.
  insert into public.iris_field_lineage_edges(
    user_id,item_id,source_type,source_id,source_field_path,
    destination_type,destination_id,destination_field_path,
    edge_role,operation,operation_version,evidence_state,metadata
  )
  values(
    new.user_id,
    (select item_id from public.plaid_accounts where id=new.account_id and user_id=new.user_id),
    'canonical_transaction',new.id,null,
    'canonical_transaction',new.id,'transaction_class',
    'canonical_to_intelligence','classify_transaction','TRANSACTION_CLASS_V1',new.classification_evidence,
    jsonb_build_object('classification_version',new.classification_version)
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.record_transaction_field_lineage() from public;
grant execute on function public.record_transaction_field_lineage() to service_role;

drop trigger if exists trg_record_transaction_field_lineage on public.transactions;
create trigger trg_record_transaction_field_lineage
after insert or update of raw_transaction_id,account_id,amount,merchant_name,plaid_category_primary,plaid_category_detailed,posted_date,pending,transaction_class,classification_evidence,classification_version
on public.transactions
for each row execute function public.record_transaction_field_lineage();

-- Backfill only from existing real raw/canonical rows. No new financial records are created.
insert into public.iris_field_lineage_edges(
  user_id,item_id,source_type,source_id,source_field_path,
  destination_type,destination_id,destination_field_path,
  edge_role,operation,operation_version,evidence_state,metadata
)
select
  t.user_id,a.item_id,'provider_raw_transaction',t.raw_transaction_id,'amount',
  'canonical_transaction',t.id,'amount','provider_to_canonical','canonical_amount','transaction-canonical-v1',r.evidence_state,
  jsonb_build_object('plaid_transaction_id',t.plaid_transaction_id)
from public.transactions t
join public.plaid_accounts a on a.id=t.account_id and a.user_id=t.user_id
join public.plaid_raw_transactions r on r.id=t.raw_transaction_id and r.user_id=t.user_id
where r.raw_response ? 'amount'
on conflict do nothing;

insert into public.iris_field_lineage_edges(
  user_id,item_id,source_type,source_id,source_field_path,
  destination_type,destination_id,destination_field_path,
  edge_role,operation,operation_version,evidence_state,metadata
)
select
  t.user_id,a.item_id,'provider_raw_transaction',t.raw_transaction_id,'date',
  'canonical_transaction',t.id,'posted_date','provider_to_canonical','canonical_posted_date','transaction-canonical-v1',r.evidence_state,
  jsonb_build_object('plaid_transaction_id',t.plaid_transaction_id)
from public.transactions t
join public.plaid_accounts a on a.id=t.account_id and a.user_id=t.user_id
join public.plaid_raw_transactions r on r.id=t.raw_transaction_id and r.user_id=t.user_id
where r.raw_response ? 'date'
on conflict do nothing;
