-- Bidirectional Iris lineage: preserve the forward provider-to-intelligence edge
-- and its exact reverse lookup edge for reconciliation.
-- No synthetic financial evidence is created by this migration.

create table if not exists public.iris_data_lineage (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.plaid_items(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  destination_type text not null,
  destination_id uuid not null,
  direction text not null check (direction in ('forward','reverse')),
  operation text not null,
  evidence_state text not null default 'observed',
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists iris_data_lineage_source_idx
  on public.iris_data_lineage(user_id,item_id,source_type,source_id,occurred_at desc);

create index if not exists iris_data_lineage_destination_idx
  on public.iris_data_lineage(user_id,item_id,destination_type,destination_id,occurred_at desc);

create unique index if not exists iris_data_lineage_edge_uidx
  on public.iris_data_lineage(user_id,item_id,source_type,source_id,destination_type,destination_id,operation);

create or replace function public.record_iris_consumption_lineage()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.raw_observation_id is not null then
    insert into public.iris_data_lineage
      (user_id,item_id,source_type,source_id,destination_type,destination_id,direction,operation,evidence_state,occurred_at,metadata)
    values
      (new.user_id,new.item_id,'provider_raw_observation',new.raw_observation_id,
       'iris_product_consumption',new.id,'forward','provider_to_intelligence','observed',
       new.consumed_at,coalesce(new.details,'{}'::jsonb))
    on conflict do nothing;

    insert into public.iris_data_lineage
      (user_id,item_id,source_type,source_id,destination_type,destination_id,direction,operation,evidence_state,occurred_at,metadata)
    values
      (new.user_id,new.item_id,'iris_product_consumption',new.id,
       'provider_raw_observation',new.raw_observation_id,'reverse','intelligence_to_provider','observed',
       new.consumed_at,coalesce(new.details,'{}'::jsonb))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_record_iris_consumption_lineage on public.iris_product_consumption;
create trigger trg_record_iris_consumption_lineage
after insert on public.iris_product_consumption
for each row execute function public.record_iris_consumption_lineage();

revoke all on table public.iris_data_lineage from public;
grant select on public.iris_data_lineage to service_role;
revoke all on function public.record_iris_consumption_lineage() from public;
grant execute on function public.record_iris_consumption_lineage() to service_role;
