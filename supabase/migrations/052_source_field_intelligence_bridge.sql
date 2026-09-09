-- Iris source-field -> intelligence bridge.
-- This migration adds governance for mappings only. It does not create financial
-- observations, derived financial values, or synthetic evidence.

create table if not exists public.iris_source_field_intelligence_bindings (
  id uuid primary key default extensions.uuid_generate_v4(),
  source_field_id uuid not null references public.iris_intelligence_source_fields(id) on delete cascade,
  intelligence_node_id uuid not null references public.iris_intelligence_nodes(id) on delete cascade,
  field_key text not null,
  field_role text not null,
  operation text not null,
  operation_version text not null,
  evidence_compatible boolean not null default true,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_field_id, intelligence_node_id, operation, operation_version)
);

create index if not exists iris_source_field_intel_binding_source_idx
  on public.iris_source_field_intelligence_bindings(source_field_id, active);
create index if not exists iris_source_field_intel_binding_node_idx
  on public.iris_source_field_intelligence_bindings(intelligence_node_id, active);

alter table public.iris_source_field_intelligence_bindings enable row level security;
alter table public.iris_source_field_intelligence_bindings force row level security;
revoke all on table public.iris_source_field_intelligence_bindings from public;
grant select on public.iris_source_field_intelligence_bindings to authenticated;
grant select,insert,update,delete on public.iris_source_field_intelligence_bindings to service_role;

drop policy if exists iris_source_field_intelligence_bindings_read_own on public.iris_source_field_intelligence_bindings;
create policy iris_source_field_intelligence_bindings_read_own
  on public.iris_source_field_intelligence_bindings for select to authenticated
  using (
    exists (
      select 1
      from public.iris_intelligence_source_fields sf
      where sf.id = source_field_id
        and sf.active = true
        and exists (
          select 1
          from public.iris_source_field_observations sfo
          where sfo.user_id = auth.uid()
            and sfo.field_path = sf.exact_provider_field_name
        )
    )
  );

comment on table public.iris_source_field_intelligence_bindings is
  'Governed many-to-many mapping from registered provider source fields to Iris intelligence nodes; mappings never constitute evidence by themselves.';
