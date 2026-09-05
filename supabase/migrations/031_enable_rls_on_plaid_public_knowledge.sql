-- Keep provider/public-knowledge catalog inaccessible through direct client table access.
-- The backend reads this catalog through the service role behind authenticated routes.
alter table public.plaid_public_knowledge enable row level security;
