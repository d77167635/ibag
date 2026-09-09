-- Keep the active plan aligned with the authoritative Iris Plaid capability catalog.
-- This migration changes configuration only; it creates no financial observations.
-- Product availability, consent, authorization, billing and observed evidence
-- remain independent runtime facts.

insert into public.ibag_plan_plaid_products(plan_key, product_key, enabled)
values
  ('all_access','auth',true),
  ('all_access','signal',true),
  ('all_access','identity',true),
  ('all_access','balance',true),
  ('all_access','transfer',true),
  ('all_access','investments_move',true),
  ('all_access','protect',true),
  ('all_access','identity_verification',true),
  ('all_access','cash_advance_index',true),
  ('all_access','monitor',true),
  ('all_access','transactions',true),
  ('all_access','investments',true),
  ('all_access','liabilities',true),
  ('all_access','enrich',true),
  ('all_access','assets',true),
  ('all_access','income',true),
  ('all_access','statements',true),
  ('all_access','income_verification',true),
  ('all_access','underwriting',true),
  ('all_access','lendscore',true),
  ('all_access','core_exchange',true),
  ('all_access','app_directory',true),
  ('all_access','permissions_manager',true),
  ('all_access','layer',true),
  ('all_access','plaid_link',true),
  ('all_access','identity_match',true),
  ('all_access','payment_initiation',true),
  ('all_access','beacon',true),
  ('all_access','employment',true),
  ('all_access','standing_orders',true),
  ('all_access','transactions_refresh',true),
  ('all_access','recurring_transactions',true),
  ('all_access','profile',true),
  ('all_access','consumer_report',true),
  ('all_access','cash_flow_insights',true),
  ('all_access','income_insights',true),
  ('all_access','network_insights',true),
  ('all_access','partner_insights',true),
  ('all_access','plaid_check_lend_score',true),
  ('all_access','plaid_credit_score',true),
  ('all_access','qualify',true),
  ('all_access','processor_payments',true),
  ('all_access','processor_identity',true),
  ('all_access','pay_by_bank',true),
  ('all_access','virtual_accounts',true),
  ('all_access','payouts',true),
  ('all_access','variable_recurring_payments',true)
on conflict (plan_key, product_key) do update set enabled = true;

insert into public.ibag_plaid_product_commercial_terms(product_key)
select distinct product_key
from public.ibag_plan_plaid_products
where plan_key = 'all_access'
on conflict (product_key) do nothing;
