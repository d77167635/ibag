-- Stage 2.2: immutable provider observation foundation.
-- Raw observations become append-only evidence records. A changed Plaid
-- transaction creates a new observation and supersedes the prior one.

ALTER TABLE public.plaid_raw_transactions
  ADD COLUMN IF NOT EXISTS observation_hash text,
  ADD COLUMN IF NOT EXISTS observation_version bigint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_id uuid,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

ALTER TABLE public.plaid_raw_balances
  ADD COLUMN IF NOT EXISTS observation_hash text;

ALTER TABLE public.plaid_raw_liabilities
  ADD COLUMN IF NOT EXISTS observation_hash text;

UPDATE public.plaid_raw_transactions
SET observation_hash = md5(raw_response::text)
WHERE observation_hash IS NULL;

UPDATE public.plaid_raw_balances
SET observation_hash = md5(raw_response::text)
WHERE observation_hash IS NULL;

UPDATE public.plaid_raw_liabilities
SET observation_hash = md5(raw_response::text)
WHERE observation_hash IS NULL;

ALTER TABLE public.plaid_raw_transactions
  DROP CONSTRAINT IF EXISTS plaid_raw_transactions_plaid_transaction_id_key;

DROP INDEX IF EXISTS public.plaid_raw_transactions_plaid_transaction_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS plaid_raw_transactions_current_provider_key
  ON public.plaid_raw_transactions(user_id, plaid_transaction_id)
  WHERE is_current;

CREATE INDEX IF NOT EXISTS idx_plaid_raw_tx_observation_lineage
  ON public.plaid_raw_transactions(user_id, plaid_transaction_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_plaid_raw_tx_current
  ON public.plaid_raw_transactions(user_id, is_current);

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

COMMENT ON FUNCTION public.record_plaid_transaction_observation(uuid, uuid, text, jsonb) IS
  'Idempotently records an immutable Plaid transaction observation and supersedes the prior current observation when the provider payload changes.';

CREATE OR REPLACE FUNCTION public.prevent_raw_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Raw provider observations are immutable; record a superseding observation instead';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.account_id IS DISTINCT FROM OLD.account_id OR
    NEW.plaid_transaction_id IS DISTINCT FROM OLD.plaid_transaction_id OR
    NEW.raw_response IS DISTINCT FROM OLD.raw_response OR
    NEW.observation_hash IS DISTINCT FROM OLD.observation_hash OR
    NEW.observation_version IS DISTINCT FROM OLD.observation_version OR
    NEW.supersedes_id IS DISTINCT FROM OLD.supersedes_id
  ) THEN
    RAISE EXCEPTION 'Raw provider observation payload and identity are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plaid_raw_transactions_immutable ON public.plaid_raw_transactions;
CREATE TRIGGER trg_plaid_raw_transactions_immutable
BEFORE DELETE OR UPDATE ON public.plaid_raw_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_raw_observation_mutation();