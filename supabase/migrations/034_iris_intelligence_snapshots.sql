create table if not exists public.iris_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamptz not null default now(),
  evidence_boundary timestamptz,
  model_version text not null,
  liquid_assets numeric,
  cash_flow_net numeric,
  safe_to_spend numeric,
  revolving_debt numeric,
  credit_utilization numeric,
  forward_projected_liquid_position numeric,
  roundup_projected numeric,
  source_fidelity_status text,
  higher_order_ready boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists iris_intelligence_snapshots_user_time_idx on public.iris_intelligence_snapshots (user_id, generated_at desc);
alter table public.iris_intelligence_snapshots enable row level security;
drop policy if exists iris_intelligence_snapshots_owner_all on public.iris_intelligence_snapshots;
create policy iris_intelligence_snapshots_owner_all on public.iris_intelligence_snapshots for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
