create or replace function public.record_roundup_sweep(
  p_user_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_available_balance numeric,
  p_safety_threshold numeric
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_event_id uuid;
  v_remaining numeric := p_amount;
  v_available numeric;
  v_alloc numeric;
  r record;
begin
  if p_amount <= 0 or not isfinite(p_amount) then raise exception 'invalid sweep amount'; end if;
  if p_available_balance is null or not isfinite(p_available_balance) then raise exception 'available balance evidence is required'; end if;
  if p_safety_threshold is null or not isfinite(p_safety_threshold) or p_safety_threshold < 0 then raise exception 'invalid safety threshold'; end if;
  if p_available_balance - p_amount < p_safety_threshold then raise exception 'roundup sweep blocked by available-funds safety gate'; end if;

  select 1 into r from public.plaid_accounts a where a.id=p_account_id and a.user_id=p_user_id for update;
  if not found then raise exception 'ownership violation'; end if;

  select coalesce(sum(c.amount),0) - coalesce((select sum(a.amount) from public.roundup_sweep_allocations a where a.account_id=p_account_id),0)
    into v_available
  from public.roundup_contributions c
  where c.account_id=p_account_id and c.user_id=p_user_id and c.calculation_version='ROUNDUP_STANDARD_V2';

  if v_available < p_amount then raise exception 'insufficient unallocated roundup contributions'; end if;

  insert into public.roundup_sweep_events(user_id,account_id,event_type,amount,available_balance_at_check,safety_threshold)
  values(p_user_id,p_account_id,'simulated_sweep',p_amount,p_available_balance,p_safety_threshold)
  returning id into v_event_id;

  for r in
    select c.id, c.amount,
           coalesce((select sum(a.amount) from public.roundup_sweep_allocations a where a.contribution_id=c.id),0) allocated
    from public.roundup_contributions c
    where c.account_id=p_account_id and c.user_id=p_user_id and c.calculation_version='ROUNDUP_STANDARD_V2'
    order by c.created_at, c.id
    for update
  loop
    exit when v_remaining <= 0;
    if r.amount > r.allocated then
      v_alloc := least(v_remaining, r.amount-r.allocated);
      insert into public.roundup_sweep_allocations(user_id,account_id,sweep_event_id,contribution_id,amount,allocation_method)
      values(p_user_id,p_account_id,v_event_id,r.id,v_alloc,'deterministic');
      v_remaining := v_remaining-v_alloc;
    end if;
  end loop;

  if v_remaining > 0 then raise exception 'roundup allocation invariant violated'; end if;
  return v_event_id;
end;
$$;

revoke execute on function public.record_roundup_sweep(uuid,uuid,numeric,numeric,numeric) from public, anon, authenticated;
