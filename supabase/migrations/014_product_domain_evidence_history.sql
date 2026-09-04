-- Stage 2.6/2.7: durable product-domain evidence history.
-- Lifecycle state and evidence state remain separate. Absence from Plaid's
-- billed/available lists is never interpreted as unsupported.

ALTER TABLE public.plaid_product_observations
  ADD COLUMN IF NOT EXISTS provider_object_id text,
  ADD COLUMN IF NOT EXISTS effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS evidence_state text NOT NULL DEFAULT 'observed',
  ADD COLUMN IF NOT EXISTS observation_version bigint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_id uuid,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS observation_hash text,
  ADD COLUMN IF NOT EXISTS requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_added boolean NOT NULL DEFAULT false;

ALTER TABLE public.plaid_product_observations
  ADD CONSTRAINT plaid_product_observations_evidence_state_ck
  CHECK (evidence_state IN ('observed','calculated','inferred','limited','insufficient_evidence','retired'));

ALTER TABLE public.plaid_product_observations
  ADD CONSTRAINT plaid_product_observations_supersedes_fk
  FOREIGN KEY (supersedes_id) REFERENCES public.plaid_product_observations(id);

CREATE UNIQUE INDEX IF NOT EXISTS plaid_product_observations_current_identity_idx
  ON public.plaid_product_observations(user_id, item_id, provider, product)
  WHERE is_current;
CREATE INDEX IF NOT EXISTS plaid_product_observations_history_idx
  ON public.plaid_product_observations(user_id, item_id, provider, product, observation_version DESC);

CREATE OR REPLACE FUNCTION public.record_plaid_product_observation(
  p_user_id uuid,
  p_item_id uuid,
  p_product text,
  p_lifecycle_state text,
  p_billed boolean,
  p_available boolean,
  p_authorized boolean,
  p_requested boolean,
  p_provider_added boolean,
  p_provenance jsonb DEFAULT '{}'::jsonb
)
RETURNS public.plaid_product_observations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  current_row public.plaid_product_observations;
  new_row public.plaid_product_observations;
  next_version bigint;
  fingerprint text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.plaid_items
    WHERE id = p_item_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Product observation ownership mismatch';
  END IF;

  SELECT * INTO current_row
  FROM public.plaid_product_observations
  WHERE user_id = p_user_id
    AND item_id = p_item_id
    AND provider = 'plaid'
    AND product = p_product
    AND is_current
  FOR UPDATE;

  fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'provider','plaid',
          'product',p_product,
          'lifecycle_state',p_lifecycle_state,
          'billed',p_billed,
          'available',p_available,
          'authorized',p_authorized,
          'requested',p_requested,
          'provider_added',p_provider_added,
          'provenance',p_provenance
        )::text,
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );

  IF current_row.id IS NOT NULL AND current_row.observation_hash = fingerprint THEN
    RETURN current_row;
  END IF;

  SELECT COALESCE(MAX(observation_version), 0) + 1 INTO next_version
  FROM public.plaid_product_observations
  WHERE user_id = p_user_id
    AND item_id = p_item_id
    AND provider = 'plaid'
    AND product = p_product;

  IF current_row.id IS NOT NULL THEN
    UPDATE public.plaid_product_observations
    SET is_current = false, lifecycle_state = 'stale'
    WHERE id = current_row.id;
  END IF;

  INSERT INTO public.plaid_product_observations (
    user_id, item_id, provider, product, lifecycle_state,
    billed, available, authorized, observed_at, provenance,
    provider_object_id, effective_at, acquired_at, evidence_state,
    observation_version, supersedes_id, is_current, observation_hash,
    requested, provider_added
  ) VALUES (
    p_user_id, p_item_id, 'plaid', p_product, p_lifecycle_state,
    p_billed, p_available, p_authorized, now(), p_provenance,
    p_product, now(), now(), 'observed',
    next_version, current_row.id, true, fingerprint,
    p_requested, p_provider_added
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_plaid_product_observation(uuid,uuid,text,text,boolean,boolean,boolean,boolean,boolean,jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_plaid_product_observation(uuid,uuid,text,text,boolean,boolean,boolean,boolean,boolean,jsonb) TO service_role;
