insert into public.plaid_public_sources (canonical_url, source_kind, title, publisher, last_verified_at, verification_status)
select distinct on (official_docs_url)
  official_docs_url,
  'api_reference',
  name || ' — Official docs',
  'Plaid',
  verified_at,
  case when verified_at is not null then 'verified' else 'unverified' end
from public.plaid_public_knowledge
where active = true and official_docs_url is not null and official_docs_url <> ''
order by official_docs_url, verified_at desc nulls last, name;

update public.plaid_public_knowledge_versions v
set source_id = s.id
from public.plaid_public_knowledge k
join public.plaid_public_sources s on s.canonical_url = k.official_docs_url
where v.knowledge_id = k.id and k.official_docs_url is not null and k.official_docs_url <> '';
