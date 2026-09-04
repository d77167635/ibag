-- Stage 2.2 correction: keep observation mutation trigger compatible with
-- the append-only supersession function by ensuring all immutable identity
-- fields are set before insert.

CREATE OR REPLACE FUNCTION public.record_plaid_transaction_observation(
  p_user_id uuid,
  p_account_id uuid,
  p_plaid_transaction_id text,
  p_raw_response jsonb
)
RETURNS public.plaid_raw_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.plaid_raw_transactions;
  created public.plaid_raw_transactions;
  next_version bigint;
  new_hash text := md5(p_raw_response::text);
BEGIN
  SELECT * INTO existing
  FROM public.plaid_raw_transactions
  WHERE user_id = p_user_id
    AND account_id = p_account_id
    AND plaid_transaction_id = p_plaid_transaction_id
    AND is_current
  ORDER BY fetched_at DESC
  LIMIT 1;

  IF FOUND AND existing.observation_hash = new_hash THEN
    RETURN existing;
  END IF;

  SELECT COALESCE(MAX(observation_version), 0) + 1 INTO next_version
  FROM public.plaid_raw_transactions
  WHERE user_id = p_user_id
    AND plaid_transaction_id = p_plaid_transaction_id;

  IF existing.id IS NOT NULL THEN
    UPDATE public.plaid_raw_transactions
    SET is_current = false
    WHERE id = existing.id;
  END IF;

  INSERT INTO public.plaid_raw_transactions (
    user_id, account_id, plaid_transaction_id, raw_response,
    fetched_at, observation_hash, observation_version, supersedes_id, is_current
  ) VALUES (
    p_user_id, p_account_id, p_plaid_transaction_id, p_raw_response,
    now(), new_hash, next_version, existing.id, true
  )
  RETURNING * INTO created;

  RETURN created;
END;
$$;

REVOKE ALL ON FUNCTION public.record_plaid_transaction_observation(uuid, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_plaid_transaction_observation(uuid, uuid, text, jsonb) TO service_role;