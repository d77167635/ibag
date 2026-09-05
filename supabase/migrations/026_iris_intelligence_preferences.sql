create table if not exists public.iris_user_intelligence_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  catalog_version text not null,
  selected_capability_ids jsonb not null default '[]'::jsonb,
  standard_name text not null default 'Iris Standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iris_user_intelligence_preferences_selected_array check (jsonb_typeof(selected_capability_ids) = 'array')
);

alter table public.iris_user_intelligence_preferences enable row level security;

create policy iris_user_intelligence_preferences_owner_all
  on public.iris_user_intelligence_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists iris_user_intelligence_preferences_updated_idx
  on public.iris_user_intelligence_preferences(updated_at desc);
