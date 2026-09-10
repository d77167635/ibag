create or replace function public.iris_certification_immutability_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run_id uuid;
  v_run_status text;
begin
  if tg_table_name = 'iris_certifications' then
    if tg_op in ('UPDATE', 'DELETE') then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: certification rows cannot be modified or deleted';
    end if;
    return new;
  end if;

  if tg_table_name = 'iris_runs' then
    if tg_op = 'INSERT' then
      return new;
    end if;
    if tg_op = 'DELETE' then
      if old.status = 'CERTIFIED' then
        raise exception 'IRIS_CERTIFICATION_IMMUTABLE: certified run cannot be deleted';
      end if;
      return old;
    end if;
    if old.status = 'CERTIFIED' then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: certified run cannot be modified';
    end if;
    return new;
  end if;

  if tg_table_name = 'iris_execution_records' then
    if tg_op = 'DELETE' then
      if old.certification_status = 'CERTIFIED' then
        raise exception 'IRIS_CERTIFICATION_IMMUTABLE: certified execution cannot be deleted';
      end if;
      v_run_id := old.run_id;
      select status into v_run_status from public.iris_runs where id = v_run_id;
      if v_run_status = 'CERTIFIED' then
        raise exception 'IRIS_CERTIFICATION_IMMUTABLE: execution cannot be deleted after run certification';
      end if;
      return old;
    end if;
    if tg_op = 'UPDATE' and old.certification_status = 'CERTIFIED' then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: certified execution cannot be modified';
    end if;
    v_run_id := new.run_id;
    select status into v_run_status from public.iris_runs where id = v_run_id;
    if v_run_status = 'CERTIFIED' then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: execution cannot be added or modified after run certification';
    end if;
    return new;
  end if;

  if tg_table_name in ('iris_execution_inputs','iris_execution_outputs') then
    select run_id into v_run_id
    from public.iris_execution_records
    where id = case when tg_op = 'DELETE' then old.execution_id else new.execution_id end;
    select status into v_run_status from public.iris_runs where id = v_run_id;
    if v_run_status = 'CERTIFIED' then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: execution artifacts cannot be added or modified after run certification';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_table_name in ('iris_run_evidence','iris_validation_results') then
    v_run_id := case when tg_op = 'DELETE' then old.run_id else new.run_id end;
    select status into v_run_status from public.iris_runs where id = v_run_id;
    if v_run_status = 'CERTIFIED' then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: run evidence and validation results cannot be added or modified after certification';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.iris_certification_immutability_guard() from public;
grant execute on function public.iris_certification_immutability_guard() to service_role;
