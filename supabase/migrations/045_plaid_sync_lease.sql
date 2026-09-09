-- Serialize provider transaction sync per Plaid Item without holding a database
-- connection open between RPC calls. The lease is durable, owner-scoped, and
-- automatically reclaimable after expiry if a worker dies.
CREATE TABLE IF NOT EXISTS public.plaid_sync_leases (
  item_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  lease_owner text NOT NULL,
  lease_until timestamptz NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_sync_leases_item_user_fk
    FOREIGN KEY (item_id, user_id) REFERENCES public.plaid_items(id, user_id)
);

CREATE INDEX IF NOT EXISTS plaid_sync_leases_user_idx
  ON public.plaid_sync_leases(user_id);

ALTER TABLE public.plaid_sync_leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plaid_sync_leases_owner_all ON public.plaid_sync_leases;
CREATE POLICY plaid_sync_leases_owner_all
  ON public.plaid_sync_leases
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.acquire_plaid_sync_lease(
  p_user_id uuid,
  p_item_id uuid,
  p_lease_owner text,
  p_lease_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_until timestamptz;
BEGIN
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Invalid sync lease duration';
  END IF;

  INSERT INTO public.plaid_sync_leases (
    item_id, user_id, lease_owner, lease_until, acquired_at, updated_at
  )
  VALUES (
    p_item_id, p_user_id, p_lease_owner,
    now() + make_interval(secs => p_lease_seconds), now(), now()
  )
  ON CONFLICT (item_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        lease_owner = EXCLUDED.lease_owner,
        lease_until = EXCLUDED.lease_until,
        acquired_at = CASE
          WHEN public.plaid_sync_leases.lease_owner = EXCLUDED.lease_owner
            THEN public.plaid_sync_leases.acquired_at
          ELSE EXCLUDED.acquired_at
        END,
        updated_at = now()
    WHERE public.plaid_sync_leases.user_id = EXCLUDED.user_id
      AND (
        public.plaid_sync_leases.lease_until <= now()
        OR public.plaid_sync_leases.lease_owner = EXCLUDED.lease_owner
      )
  RETURNING lease_until INTO v_until;

  RETURN v_until IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_plaid_sync_lease(
  p_user_id uuid,
  p_item_id uuid,
  p_lease_owner text,
  p_lease_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Invalid sync lease duration';
  END IF;

  UPDATE public.plaid_sync_leases
     SET lease_until = now() + make_interval(secs => p_lease_seconds),
         updated_at = now()
   WHERE item_id = p_item_id
     AND user_id = p_user_id
     AND lease_owner = p_lease_owner
     AND lease_until > now();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_plaid_sync_lease(
  p_user_id uuid,
  p_item_id uuid,
  p_lease_owner text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM public.plaid_sync_leases
   WHERE item_id = p_item_id
     AND user_id = p_user_id
     AND lease_owner = p_lease_owner;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_plaid_sync_lease(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_plaid_sync_lease(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_plaid_sync_lease(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_plaid_sync_lease(uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_plaid_sync_lease(uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_plaid_sync_lease(uuid, uuid, text) TO service_role;
