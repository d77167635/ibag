-- Stage 2.6/2.7: internal product observation RPC must never be callable
-- by PUBLIC, anon, or authenticated clients.

REVOKE ALL ON FUNCTION public.record_plaid_product_observation(uuid,uuid,text,text,boolean,boolean,boolean,boolean,boolean,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_plaid_product_observation(uuid,uuid,text,text,boolean,boolean,boolean,boolean,boolean,jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_plaid_product_observation(uuid,uuid,text,text,boolean,boolean,boolean,boolean,boolean,jsonb) TO service_role;
