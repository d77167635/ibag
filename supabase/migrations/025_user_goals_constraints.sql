create table if not exists public.iris_user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective text not null check (objective in ('stabilize_liquidity','improve_cash_flow','reduce_pressure','build_roundups','understand_finances')),
  title text not null,
  description text,
  priority integer not null default 3 check (priority between 1 and 5),
  horizon_days integer check (horizon_days is null or horizon_days between 1 and 3650),
  target_amount_cents bigint,
  target_date date,
  active boolean not null default true,
  source text not null default 'user_declared' check (source = 'user_declared'),
  constraints jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists iris_user_goals_user_active_idx on public.iris_user_goals(user_id, active, priority);
create index if not exists iris_user_goals_user_updated_idx on public.iris_user_goals(user_id, updated_at desc);
alter table public.iris_user_goals enable row level security;
drop policy if exists iris_user_goals_select_own on public.iris_user_goals;
drop policy if exists iris_user_goals_insert_own on public.iris_user_goals;
drop policy if exists iris_user_goals_update_own on public.iris_user_goals;
drop policy if exists iris_user_goals_delete_own on public.iris_user_goals;
create policy iris_user_goals_select_own on public.iris_user_goals for select using (auth.uid() = user_id);
create policy iris_user_goals_insert_own on public.iris_user_goals for insert with check (auth.uid() = user_id);
create policy iris_user_goals_update_own on public.iris_user_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy iris_user_goals_delete_own on public.iris_user_goals for delete using (auth.uid() = user_id);
create or replace function public.iris_user_goals_set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists iris_user_goals_updated_at on public.iris_user_goals;
create trigger iris_user_goals_updated_at before update on public.iris_user_goals for each row execute function public.iris_user_goals_set_updated_at();