-- Stage 2.4/2.5: normalized transactions retain provider removals.
-- A provider removal is an observation about provider state, not permission
-- to destroy the normalized financial record.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS retired_at timestamptz,
  ADD COLUMN IF NOT EXISTS retirement_reason text;

CREATE INDEX IF NOT EXISTS idx_transactions_user_active_date
  ON public.transactions(user_id, is_active, posted_date DESC);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_retirement_reason_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_retirement_reason_check
  CHECK (retirement_reason IS NULL OR retirement_reason IN (
    'provider_removed',
    'superseded',
    'system_invalidated',
    'user_deleted'
  ));

CREATE OR REPLACE FUNCTION public.retire_normalized_transaction(
  p_user_id uuid,
  p_plaid_transaction_id text,
  p_reason text DEFAULT 'provider_removed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.transactions
  SET is_active = false,
      retired_at = COALESCE(retired_at, now()),
      retirement_reason = COALESCE(retirement_reason, p_reason)
  WHERE user_id = p_user_id
    AND plaid_transaction_id = p_plaid_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.retire_normalized_transaction(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.retire_normalized_transaction(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.retire_normalized_transaction(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.retire_normalized_transaction(uuid, text, text) TO service_role;
