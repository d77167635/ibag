-- Stage 2.2: retire removed provider transactions without deleting evidence.
CREATE OR REPLACE FUNCTION public.retire_plaid_transaction_observation(
  p_user_id uuid,
  p_plaid_transaction_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.plaid_raw_transactions
  SET is_current = false
  WHERE user_id = p_user_id
    AND plaid_transaction_id = p_plaid_transaction_id
    AND is_current;
END;
$$;

REVOKE ALL ON FUNCTION public.retire_plaid_transaction_observation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retire_plaid_transaction_observation(uuid, text) TO service_role;