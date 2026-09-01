-- Separates genuine recurring bills (rent, loan payments) from recurring
-- discretionary habits (coffee, rideshare) that happen to repeat on a
-- consistent schedule in test data. Only is_essential=true series should
-- ever be treated as "bills" for Safe-to-Spend / collision detection —
-- the raw table still tracks everything for general "recurring activity"
-- purposes.
alter table public.recurring_series
  add column is_essential boolean not null default false;
