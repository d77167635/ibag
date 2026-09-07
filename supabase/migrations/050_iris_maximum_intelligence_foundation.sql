-- Iris maximum-intelligence foundation. Additive and evidence-only.
create table if not exists public.iris_capability_contracts (
  id uuid primary key default gen_random_uuid(), capability_id text not null, version text not null,
  operator_id text not null, operator_version text not null, evidence_requirements jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb, validation_rules jsonb not null default '[]'::jsonb,
  output_type text not null, recursive boolean not null default false, cross_domain boolean not null default false,
  active boolean not null default true, created_at timestamptz not null default now(), unique(capability_id,version)
);
create index if not exists idx_iris_capability_contracts_active on public.iris_capability_contracts(active,capability_id);
create table if not exists public.iris_source_field_observations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, product text not null, item_id uuid not null, raw_observation_id uuid not null,
  field_path text not null, field_type text, value_hash text, occurrence_count bigint not null default 1,
  first_observed_at timestamptz, last_observed_at timestamptz, evidence_state text not null default 'observed',
  lineage jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,provider,product,item_id,raw_observation_id,field_path)
);
create index if not exists idx_iris_source_field_obs_user_product on public.iris_source_field_observations(user_id,product,field_path);
create index if not exists idx_iris_source_field_obs_user_last on public.iris_source_field_observations(user_id,last_observed_at desc);
alter table public.iris_capability_contracts enable row level security;
alter table public.iris_capability_contracts force row level security;
alter table public.iris_source_field_observations enable row level security;
alter table public.iris_source_field_observations force row level security;
drop policy if exists iris_capability_contracts_read on public.iris_capability_contracts;
create policy iris_capability_contracts_read on public.iris_capability_contracts for select to authenticated using (true);
drop policy if exists iris_source_field_observations_read_own on public.iris_source_field_observations;
create policy iris_source_field_observations_read_own on public.iris_source_field_observations for select to authenticated using (auth.uid()=user_id);

create or replace function public.materialize_iris_json_fields(p_user_id uuid,p_item_id uuid,p_raw_id uuid,p_provider text,p_product text,p_value jsonb,p_path text,p_acquired timestamptz)
returns bigint language plpgsql security definer set search_path=public as $$
declare e record; n bigint:=0; child_path text; typ text;
begin
  if p_path<>'' then
    typ:=case when jsonb_typeof(p_value)='null' then 'null' else jsonb_typeof(p_value) end;
    insert into public.iris_source_field_observations(user_id,provider,product,item_id,raw_observation_id,field_path,field_type,value_hash,occurrence_count,first_observed_at,last_observed_at,evidence_state,lineage)
    values(p_user_id,p_provider,p_product,p_item_id,p_raw_id,p_path,typ,md5(p_value::text),1,p_acquired,p_acquired,'observed',jsonb_build_object('provider',p_provider,'product',p_product,'raw_observation_id',p_raw_id,'path',p_path))
    on conflict (user_id,provider,product,item_id,raw_observation_id,field_path) do update set field_type=excluded.field_type,value_hash=excluded.value_hash,occurrence_count=public.iris_source_field_observations.occurrence_count+1,last_observed_at=excluded.last_observed_at,updated_at=now();
    n:=1;
  end if;
  if jsonb_typeof(p_value)='object' then
    for e in select key,value from jsonb_each(p_value) loop child_path:=case when p_path='' then e.key else p_path||'.'||e.key end; n:=n+public.materialize_iris_json_fields(p_user_id,p_item_id,p_raw_id,p_provider,p_product,e.value,child_path,p_acquired); end loop;
  elsif jsonb_typeof(p_value)='array' then
    for e in select value,ordinality from jsonb_array_elements(p_value) with ordinality loop child_path:=p_path||'['||e.ordinality::text||']'; n:=n+public.materialize_iris_json_fields(p_user_id,p_item_id,p_raw_id,p_provider,p_product,e.value,child_path,p_acquired); end loop;
  end if;
  return n;
end $$;
create or replace function public.materialize_iris_source_fields(p_observation_id uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare r record; n bigint;
begin
  select id,user_id,item_id,product,raw_response,acquired_at into r from public.plaid_raw_product_observations where id=p_observation_id;
  if not found then return 0; end if;
  n:=public.materialize_iris_json_fields(r.user_id,r.item_id,r.id,'plaid',r.product,r.raw_response,'',r.acquired_at); return n;
end $$;
create or replace function public.trg_materialize_iris_source_fields() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.evidence_state='observed' then perform public.materialize_iris_source_fields(new.id); end if; return new; end $$;
drop trigger if exists trg_iris_materialize_source_fields on public.plaid_raw_product_observations;
create trigger trg_iris_materialize_source_fields after insert on public.plaid_raw_product_observations for each row execute function public.trg_materialize_iris_source_fields();

insert into public.iris_capability_contracts(capability_id,version,operator_id,operator_version,evidence_requirements,dependencies,validation_rules,output_type,recursive,cross_domain)
select key,'1.0.0',key,'1.0.0',jsonb_build_array('authorized_plaid_evidence','canonical_financial_model'),'[]'::jsonb,jsonb_build_array('user_isolation','lineage_present','evidence_state_valid'),capability_group,false,(capability_group in ('reasoning','decision','forecasting','synthesis'))
from public.iris_intelligence_capabilities where active=true on conflict(capability_id,version) do nothing;
