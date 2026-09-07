create table if not exists public.iris_runs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_surface text not null,
  request_mode text not null,
  requested_capabilities jsonb not null default '[]'::jsonb,
  status text not null check (status in ('PLANNED','EXECUTING','EXECUTED','VALIDATING','VALIDATED','CERTIFYING','CERTIFIED','FAILED','VALIDATION_FAILED','NOT_CERTIFIED')),
  as_of timestamptz not null,
  evidence_boundary timestamptz,
  evidence_version text,
  resource_budget jsonb,
  execution_policy jsonb,
  planner_version text not null,
  orchestrator_version text not null,
  certification_policy_version text not null,
  financial_context_hash text,
  evidence_manifest_hash text,
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create table if not exists public.iris_run_evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.iris_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  evidence_type text not null,
  provider text,
  product text,
  receipt_id uuid,
  product_observation_id uuid,
  raw_observation_id uuid,
  source_field_id uuid,
  effective_at timestamptz,
  acquired_at timestamptz,
  evidence_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.iris_execution_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.iris_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  capability_id text not null,
  operator_id text not null,
  operator_version text not null,
  execution_state text not null check (execution_state in ('PLANNED','EXECUTING','EXECUTED','FAILED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  input_hash text,
  output_hash text,
  evidence_state text not null check (evidence_state in ('OBSERVED','CALCULATED','INFERRED','LIMITED','INSUFFICIENT_EVIDENCE')),
  input_manifest jsonb,
  output_snapshot jsonb,
  validation_status text not null default 'UNKNOWN' check (validation_status in ('UNKNOWN','PASS','FAIL','LIMITED')),
  certification_status text not null default 'PENDING' check (certification_status in ('PENDING','CERTIFIED','NOT_CERTIFIED')),
  resource_usage jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.iris_execution_inputs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.iris_execution_records(id) on delete cascade,
  input_type text not null,
  reference_type text not null,
  reference_id text not null,
  role text not null,
  hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.iris_execution_outputs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.iris_execution_records(id) on delete cascade,
  output_key text not null,
  output_type text not null,
  value jsonb,
  hash text not null,
  evidence_state text not null check (evidence_state in ('OBSERVED','CALCULATED','INFERRED','LIMITED','INSUFFICIENT_EVIDENCE')),
  uncertainty jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.iris_validation_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.iris_runs(id) on delete cascade,
  execution_id uuid references public.iris_execution_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rule_id text not null,
  rule_version text not null,
  status text not null check (status in ('UNKNOWN','PASS','FAIL','LIMITED')),
  severity text not null check (severity in ('INFO','WARNING','CRITICAL')),
  expected jsonb,
  actual jsonb,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.iris_certifications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.iris_runs(id) on delete cascade,
  execution_id uuid references public.iris_execution_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  result_id uuid,
  policy_version text not null,
  status text not null check (status in ('PENDING','CERTIFIED','NOT_CERTIFIED')),
  validation_snapshot jsonb not null default '{}'::jsonb,
  reconciliation_snapshot jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  certification_hash text,
  certified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists iris_runs_user_created_idx on public.iris_runs(user_id, created_at desc);
create index if not exists iris_run_evidence_run_idx on public.iris_run_evidence(run_id);
create index if not exists iris_run_evidence_user_idx on public.iris_run_evidence(user_id);
create index if not exists iris_execution_records_run_idx on public.iris_execution_records(run_id);
create index if not exists iris_execution_records_user_idx on public.iris_execution_records(user_id);
create index if not exists iris_execution_inputs_execution_idx on public.iris_execution_inputs(execution_id);
create index if not exists iris_execution_outputs_execution_idx on public.iris_execution_outputs(execution_id);
create index if not exists iris_validation_results_run_idx on public.iris_validation_results(run_id);
create index if not exists iris_validation_results_execution_idx on public.iris_validation_results(execution_id);
create index if not exists iris_validation_results_user_idx on public.iris_validation_results(user_id);
create index if not exists iris_certifications_run_idx on public.iris_certifications(run_id);
create index if not exists iris_certifications_execution_idx on public.iris_certifications(execution_id);
create index if not exists iris_certifications_user_idx on public.iris_certifications(user_id);

alter table public.iris_runs enable row level security;
alter table public.iris_run_evidence enable row level security;
alter table public.iris_execution_records enable row level security;
alter table public.iris_execution_inputs enable row level security;
alter table public.iris_execution_outputs enable row level security;
alter table public.iris_validation_results enable row level security;
alter table public.iris_certifications enable row level security;

create policy iris_runs_select_own on public.iris_runs for select to authenticated using (user_id = auth.uid());
create policy iris_run_evidence_select_own on public.iris_run_evidence for select to authenticated using (user_id = auth.uid());
create policy iris_execution_records_select_own on public.iris_execution_records for select to authenticated using (user_id = auth.uid());
create policy iris_execution_inputs_select_own on public.iris_execution_inputs for select to authenticated using (exists (select 1 from public.iris_execution_records e where e.id = execution_id and e.user_id = auth.uid()));
create policy iris_execution_outputs_select_own on public.iris_execution_outputs for select to authenticated using (exists (select 1 from public.iris_execution_records e where e.id = execution_id and e.user_id = auth.uid()));
create policy iris_validation_results_select_own on public.iris_validation_results for select to authenticated using (user_id = auth.uid());
create policy iris_certifications_select_own on public.iris_certifications for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.iris_runs from anon, authenticated;
revoke insert, update, delete on public.iris_run_evidence from anon, authenticated;
revoke insert, update, delete on public.iris_execution_records from anon, authenticated;
revoke insert, update, delete on public.iris_execution_inputs from anon, authenticated;
revoke insert, update, delete on public.iris_execution_outputs from anon, authenticated;
revoke insert, update, delete on public.iris_validation_results from anon, authenticated;
revoke insert, update, delete on public.iris_certifications from anon, authenticated;
