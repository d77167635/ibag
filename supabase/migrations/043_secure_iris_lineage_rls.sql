-- Iris lineage is service-written audit evidence. Keep it inaccessible to
-- anonymous/public roles and enforce user ownership for authenticated reads.
alter table public.iris_data_lineage enable row level security;

revoke all on table public.iris_data_lineage from public;
grant select on table public.iris_data_lineage to authenticated;
grant select on table public.iris_data_lineage to service_role;

drop policy if exists iris_data_lineage_select_own on public.iris_data_lineage;
create policy iris_data_lineage_select_own
  on public.iris_data_lineage
  for select
  to authenticated
  using (user_id = auth.uid());

-- No client INSERT/UPDATE/DELETE policy is intentionally provided. Lineage
-- remains append-only from trusted server-side/service-role execution paths.
