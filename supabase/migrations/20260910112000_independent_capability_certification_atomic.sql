-- Atomic certification for one independently executed Iris capability.
-- Unlike finalize_iris_certification(), this function does not mark the entire
-- run CERTIFIED because one run may contain multiple independent capabilities.
create or replace function public.finalize_iris_capability_certification(
  p_run_id uuid,
  p_execution_id uuid,
  p_user_id uuid,
  p_policy_version text,
  p_validation_snapshot jsonb,
  p_reconciliation_snapshot jsonb,
  p_evidence_snapshot jsonb,
  p_certification_hash text,
  p_certified_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_execution public.iris_execution_records%rowtype;
begin
  select * into v_execution
  from public.iris_execution_records
  where id = p_execution_id
    and run_id = p_run_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'IRIS_CAPABILITY_CERTIFICATION: execution not found or ownership mismatch';
  end if;

  if v_execution.execution_state <> 'EXECUTED' then
    raise exception 'IRIS_CAPABILITY_CERTIFICATION: execution is not executed';
  end if;

  if v_execution.certification_status <> 'PENDING' then
    raise exception 'IRIS_CAPABILITY_CERTIFICATION: execution is no longer pending certification';
  end if;

  insert into public.iris_certifications (
    run_id,
    execution_id,
    user_id,
    result_id,
    policy_version,
    status,
    validation_snapshot,
    reconciliation_snapshot,
    evidence_snapshot,
    certification_hash,
    certified_at
  ) values (
    p_run_id,
    p_execution_id,
    p_user_id,
    p_execution_id,
    p_policy_version,
    'CERTIFIED',
    p_validation_snapshot,
    p_reconciliation_snapshot,
    p_evidence_snapshot,
    p_certification_hash,
    p_certified_at
  );

  update public.iris_execution_records
  set validation_status = 'PASS',
      certification_status = 'CERTIFIED',
      completed_at = coalesce(completed_at, p_certified_at)
  where id = p_execution_id
    and run_id = p_run_id
    and user_id = p_user_id;

  if not found then
    raise exception 'IRIS_CAPABILITY_CERTIFICATION: execution certification update failed';
  end if;
end;
$$;

revoke all on function public.finalize_iris_capability_certification(
  uuid, uuid, uuid, text, jsonb, jsonb, jsonb, text, timestamptz
) from public;
grant execute on function public.finalize_iris_capability_certification(
  uuid, uuid, uuid, text, jsonb, jsonb, jsonb, text, timestamptz
) to service_role;
