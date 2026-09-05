-- Optimize auth function evaluation in RLS policies.
-- Wrapping auth.role()/auth.uid() in SELECT lets PostgreSQL initialize the
-- value once per statement rather than re-evaluating it for every row.

drop policy if exists "domains_read_all_authenticated" on public.domains;
create policy "domains_read_all_authenticated" on public.domains
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "subdomains_read_all_authenticated" on public.subdomains;
create policy "subdomains_read_all_authenticated" on public.subdomains
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "category_mapping_read_all_authenticated" on public.category_mapping;
create policy "category_mapping_read_all_authenticated" on public.category_mapping
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "merchants_read_authenticated" on public.merchants;
create policy "merchants_read_authenticated" on public.merchants
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "merchant_aliases_read_authenticated" on public.merchant_aliases;
create policy "merchant_aliases_read_authenticated" on public.merchant_aliases
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "webhook_events_service_role_only" on public.plaid_webhook_events;
create policy "webhook_events_service_role_only" on public.plaid_webhook_events
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "iris_user_goals_delete_own" on public.iris_user_goals;
create policy "iris_user_goals_delete_own" on public.iris_user_goals
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "iris_user_goals_insert_own" on public.iris_user_goals;
create policy "iris_user_goals_insert_own" on public.iris_user_goals
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "iris_user_goals_select_own" on public.iris_user_goals;
create policy "iris_user_goals_select_own" on public.iris_user_goals
  for select using ((select auth.uid()) = user_id);

drop policy if exists "iris_user_goals_update_own" on public.iris_user_goals;
create policy "iris_user_goals_update_own" on public.iris_user_goals
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "iris_user_intelligence_preferences_owner_all" on public.iris_user_intelligence_preferences;
create policy "iris_user_intelligence_preferences_owner_all" on public.iris_user_intelligence_preferences
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
