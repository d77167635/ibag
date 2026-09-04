-- Expand plan configuration as Plaid publishes additional product surfaces.
-- This contains no financial observations or fabricated financial data.
insert into public.ibag_plan_plaid_products(plan_key, product_key, enabled)
values
  ('all_access','identity_match',true),
  ('all_access','payment_initiation',true),
  ('all_access','virtual_accounts',true),
  ('all_access','payouts',true),
  ('all_access','variable_recurring_payments',true),
  ('all_access','consumer_report',true),
  ('all_access','cash_flow_insights',true),
  ('all_access','income_insights',true),
  ('all_access','network_insights',true),
  ('all_access','partner_insights',true),
  ('all_access','plaid_check_lend_score',true),
  ('all_access','employment',true),
  ('all_access','standing_orders',true),
  ('all_access','transactions_refresh',true),
  ('all_access','recurring_transactions',true)
on conflict (plan_key, product_key) do update set enabled = true;

insert into public.ibag_plaid_product_commercial_terms(product_key)
select product_key from public.ibag_plan_plaid_products
on conflict (product_key) do nothing;

create or replace function public.assign_default_ibag_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ibag_user_plan_subscriptions(user_id, plan_key, status)
  values (new.id, 'all_access', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_assign_default_ibag_plan on public.profiles;
create trigger profiles_assign_default_ibag_plan
after insert on public.profiles
for each row execute function public.assign_default_ibag_plan();
