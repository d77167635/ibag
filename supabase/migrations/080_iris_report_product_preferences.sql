-- Iris report products are user-controllable publications of intelligence.
-- This stores preference state only. It creates no financial/provider observations.
create table if not exists public.iris_user_report_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  catalog_version text not null,
  selected_report_ids jsonb not null default '[]'::jsonb,
  activation_mode text not null default 'all_available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iris_user_report_preferences_selected_array
    check (jsonb_typeof(selected_report_ids) = 'array'),
  constraint iris_user_report_preferences_activation_mode
    check (activation_mode in ('all_available', 'explicit'))
);

alter table public.iris_user_report_preferences enable row level security;

create policy iris_user_report_preferences_owner_all
  on public.iris_user_report_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists iris_user_report_preferences_updated_idx
  on public.iris_user_report_preferences(updated_at desc);
