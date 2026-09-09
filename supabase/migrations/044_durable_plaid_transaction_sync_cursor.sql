-- Durable provider checkpoint for Plaid /transactions/sync.
-- sync_runs remains the execution/audit record; this table is the canonical
-- long-lived provider cursor so a later sync never silently restarts at null.
--
-- The composite ownership key is created before the dependent foreign key so
-- a clean migration run is valid on PostgreSQL.
ALTER TABLE public.plaid_items
  ADD CONSTRAINT plaid_items_id_user_unique UNIQUE (id, user_id);

CREATE TABLE IF NOT EXISTS public.plaid_transaction_sync_state (
  id uuid PRIMARY KEY default extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  item_id uuid NOT NULL,
  cursor text,
  pages_processed bigint NOT NULL DEFAULT 0,
  last_checkpoint_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_transaction_sync_state_item_user_fk
    FOREIGN KEY (item_id, user_id) REFERENCES public.plaid_items(id, user_id),
  CONSTRAINT plaid_transaction_sync_state_item_unique UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS plaid_transaction_sync_state_user_idx
  ON public.plaid_transaction_sync_state(user_id, updated_at DESC);

ALTER TABLE public.plaid_transaction_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plaid_transaction_sync_state_owner_all ON public.plaid_transaction_sync_state;
CREATE POLICY plaid_transaction_sync_state_owner_all
  ON public.plaid_transaction_sync_state
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_plaid_transaction_sync_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plaid_transaction_sync_state_updated_at ON public.plaid_transaction_sync_state;
CREATE TRIGGER plaid_transaction_sync_state_updated_at
BEFORE UPDATE ON public.plaid_transaction_sync_state
FOR EACH ROW EXECUTE FUNCTION public.touch_plaid_transaction_sync_state_updated_at();

REVOKE ALL ON FUNCTION public.touch_plaid_transaction_sync_state_updated_at() FROM PUBLIC, anon, authenticated;
