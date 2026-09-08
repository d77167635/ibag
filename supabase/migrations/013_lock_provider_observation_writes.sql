-- Iris authoritative evidence boundary:
-- provider observations are server-owned evidence and must not be writable
-- directly by browser-authenticated clients.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.plaid_product_observations FROM anon, authenticated;

ALTER TABLE public.plaid_product_observations FORCE ROW LEVEL SECURITY;

-- Preserve authenticated read access only through the existing owner-scoped
-- SELECT policy. The service-role/server ingestion path remains authoritative.
