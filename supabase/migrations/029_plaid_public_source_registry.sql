create table if not exists public.plaid_public_sources (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  docs_url text,
  source_kind text not null check (source_kind in ('product_page','api_reference','guide','support','status','other')),
  title text,
  publisher text not null default 'Plaid',
  first_seen_at timestamptz not null default now(),
  last_verified_at timestamptz,
  last_content_hash text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','changed','unavailable')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plaid_public_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  knowledge_id uuid not null references public.plaid_public_knowledge(id) on delete cascade,
  source_id uuid references public.plaid_public_sources(id) on delete set null,
  version_number integer not null,
  content_hash text,
  snapshot jsonb not null,
  captured_at timestamptz not null default now(),
  change_type text not null default 'snapshot' check (change_type in ('snapshot','created','updated','verified','retired')),
  unique (knowledge_id, version_number)
);

create index if not exists idx_plaid_public_sources_status on public.plaid_public_sources(active, verification_status);
create index if not exists idx_plaid_public_knowledge_versions_knowledge on public.plaid_public_knowledge_versions(knowledge_id, captured_at desc);

alter table public.plaid_public_sources enable row level security;
alter table public.plaid_public_knowledge_versions enable row level security;

insert into public.plaid_public_sources (canonical_url, docs_url, source_kind, title, publisher, last_verified_at, verification_status)
select distinct on (official_source_url)
  official_source_url,
  nullif(official_docs_url, ''),
  case when official_source_url like '%/docs/%' then 'api_reference' else 'product_page' end,
  name,
  'Plaid',
  verified_at,
  case when verified_at is not null then 'verified' else 'unverified' end
from public.plaid_public_knowledge
where active = true and official_source_url is not null and official_source_url <> ''
order by official_source_url, verified_at desc nulls last, name;

insert into public.plaid_public_knowledge_versions (knowledge_id, source_id, version_number, content_hash, snapshot, captured_at, change_type)
select
  k.id,
  s.id,
  1,
  md5(concat_ws('|', k.name, k.description, k.what_it_does, k.how_it_works, k.who_uses_it, k.when_used, k.why_it_exists, k.public_data_scope, k.iris_capabilities::text, k.plaid_item_states::text, k.availability_notes, k.pricing_notes, k.official_source_url, k.official_docs_url)),
  to_jsonb(k),
  coalesce(k.verified_at, now()),
  'snapshot'
from public.plaid_public_knowledge k
left join public.plaid_public_sources s on s.canonical_url = k.official_source_url
where k.active = true
on conflict (knowledge_id, version_number) do nothing;
