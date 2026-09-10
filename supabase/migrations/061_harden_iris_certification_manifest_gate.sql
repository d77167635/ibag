create or replace function public.iris_certification_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_execution record;
  v_run record;
  v_output_count integer;
  v_validation_count integer;
  v_validation_total integer;
  v_critical_count integer;
  v_evidence_count integer;
  v_check_count integer;
begin
  if new.status <> 'CERTIFIED' then return new; end if;

  select * into v_execution from public.iris_execution_records where id = new.execution_id and run_id = new.run_id and user_id = new.user_id;
  if not found or v_execution.execution_state <> 'EXECUTED' or v_execution.validation_status <> 'PASS' or v_execution.certification_status <> 'PENDING' then
    raise exception 'IRIS_CERTIFICATION_GATE: execution state/ownership/validation gate failed';
  end if;

  select * into v_run from public.iris_runs where id = new.run_id and user_id = new.user_id;
  if not found or v_run.evidence_manifest_hash is null or v_run.as_of is null then
    raise exception 'IRIS_CERTIFICATION_GATE: run evidence boundary missing';
  end if;

  select count(*) into v_output_count from public.iris_execution_outputs where execution_id = new.execution_id and hash = v_execution.output_hash and evidence_state <> 'OBSERVED';
  if v_output_count = 0 then raise exception 'IRIS_CERTIFICATION_GATE: output integrity gate failed'; end if;

  select count(*) into v_validation_total from public.iris_validation_results where run_id = new.run_id and execution_id = new.execution_id and user_id = new.user_id;
  select count(*) into v_validation_count from public.iris_validation_results where run_id = new.run_id and execution_id = new.execution_id and user_id = new.user_id and status = 'PASS';
  select count(*) into v_critical_count from public.iris_validation_results where run_id = new.run_id and execution_id = new.execution_id and user_id = new.user_id and severity = 'CRITICAL' and status <> 'PASS';
  v_check_count := case when jsonb_typeof(new.validation_snapshot->'checks') = 'object' then jsonb_object_length(new.validation_snapshot->'checks') else 0 end;
  if v_validation_total = 0 or v_validation_total <> v_validation_count or v_critical_count > 0 or v_check_count <> v_validation_total then
    raise exception 'IRIS_CERTIFICATION_GATE: validation manifest is incomplete or contains failures';
  end if;

  select count(*) into v_evidence_count from public.iris_run_evidence where run_id = new.run_id and user_id = new.user_id and evidence_hash is not null;
  if v_evidence_count = 0 then raise exception 'IRIS_CERTIFICATION_GATE: no run evidence attached'; end if;

  if new.validation_snapshot is null or coalesce(new.validation_snapshot->>'status','') <> 'PASS' then raise exception 'IRIS_CERTIFICATION_GATE: certification validation snapshot failed'; end if;
  if new.reconciliation_snapshot is null or coalesce(new.reconciliation_snapshot->>'status','') <> 'PASS' then raise exception 'IRIS_CERTIFICATION_GATE: reconciliation snapshot failed'; end if;
  if new.evidence_snapshot is null or coalesce(new.evidence_snapshot->>'evidence_state','') = '' then raise exception 'IRIS_CERTIFICATION_GATE: evidence snapshot failed'; end if;

  return new;
end; $function$;