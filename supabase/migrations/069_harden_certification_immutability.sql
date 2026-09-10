create or replace function public.iris_certification_immutability_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_run_status text;
begin
  if tg_table_name = 'iris_certifications' then
    raise exception 'IRIS_CERTIFICATION_IMMUTABLE: certification rows cannot be modified or deleted';
  end if;

  if tg_table_name = 'iris_runs' then
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
      return old;
    end if;
    if tg_op = 'UPDATE' and old.certification_status = 'CERTIFIED' then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: certified execution cannot be modified';
    end if;
    v_run_id := case when tg_op = 'DELETE' then old.run_id else new.run_id end;
    select status into v_run_status from public.iris_runs where id = v_run_id;
    if v_run_status = 'CERTIFIED' then
      raise exception 'IRIS_CERTIFICATION_IMMUTABLE: execution cannot be added or modified after run certification';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
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

drop trigger if exists trg_iris_certification_immutability on public.iris_certifications;
create trigger trg_iris_certification_immutability before update or delete on public.iris_certifications for each row execute function public.iris_certification_immutability_guard();
drop trigger if exists trg_iris_run_certification_immutability on public.iris_runs;
create trigger trg_iris_run_certification_immutability before insert or update or delete on public.iris_runs for each row execute function public.iris_certification_immutability_guard();
drop trigger if exists trg_iris_execution_certification_immutability on public.iris_execution_records;
create trigger trg_iris_execution_certification_immutability before insert or update or delete on public.iris_execution_records for each row execute function public.iris_certification_immutability_guard();
drop trigger if exists trg_iris_execution_input_certification_immutability on public.iris_execution_inputs;
create trigger trg_iris_execution_input_certification_immutability before insert or update or delete on public.iris_execution_inputs for each row execute function public.iris_certification_immutability_guard();
drop trigger if exists trg_iris_execution_output_certification_immutability on public.iris_execution_outputs;
create trigger trg_iris_execution_output_certification_immutability before insert or update or delete on public.iris_execution_outputs for each row execute function public.iris_certification_immutability_guard();
drop trigger if exists trg_iris_run_evidence_certification_immutability on public.iris_run_evidence;
create trigger trg_iris_run_evidence_certification_immutability before insert or update or delete on public.iris_run_evidence for each row execute function public.iris_certification_immutability_guard();
drop trigger if exists trg_iris_validation_certification_immutability on public.iris_validation_results;
create trigger trg_iris_validation_certification_immutability before insert or update or delete on public.iris_validation_results for each row execute function public.iris_certification_immutability_guard();

revoke truncate on public.iris_runs, public.iris_run_evidence, public.iris_execution_records, public.iris_execution_inputs, public.iris_execution_outputs, public.iris_validation_results, public.iris_certifications from anon, authenticated, service_role;
revoke update, delete, truncate on public.iris_certifications from service_role;
