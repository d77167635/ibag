-- Cover foreign keys identified by the Supabase performance advisor.
create index if not exists ibag_user_plan_subscriptions_plan_key_idx
  on public.ibag_user_plan_subscriptions (plan_key);

create index if not exists plaid_product_observations_supersedes_idx
  on public.plaid_product_observations (supersedes_id);

create index if not exists plaid_public_knowledge_versions_source_id_idx
  on public.plaid_public_knowledge_versions (source_id);
