-- Durable Outcome -> Learning -> Emergent state
-- Only explicitly observed/validated outcomes may enter the learning loop.
-- No financial outcome is synthesized by this schema.

CREATE TABLE IF NOT EXISTS public.iris_outcome_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  run_id uuid NULL REFERENCES public.iris_runs(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  outcome_type text NOT NULL,
  outcome_state text NOT NULL CHECK (outcome_state IN ('OBSERVED','VALIDATED','CONTRADICTED','STALE','INSUFFICIENT_EVIDENCE')),
  value jsonb NOT NULL,
  observed_at timestamptz NOT NULL,
  effective_at timestamptz NULL,
  evidence_hash text NOT NULL,
  source_hash text NULL,
  lineage jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, outcome_type, observed_at, evidence_hash)
);

CREATE INDEX IF NOT EXISTS iris_outcome_observations_user_idx
  ON public.iris_outcome_observations(user_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.iris_learning_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  outcome_id uuid NOT NULL REFERENCES public.iris_outcome_observations(id) ON DELETE RESTRICT,
  rule_type text NOT NULL,
  rule_key text NOT NULL,
  input_fingerprint text NOT NULL,
  evidence_hash text NOT NULL,
  learning_state text NOT NULL CHECK (learning_state IN ('PROPOSED','VALIDATED','REJECTED','SUPERSEDED')),
  learned_value jsonb NOT NULL,
  support_count integer NOT NULL DEFAULT 1 CHECK (support_count > 0),
  confidence numeric NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  learned_at timestamptz NOT NULL DEFAULT now(),
  supersedes_id uuid NULL REFERENCES public.iris_learning_experiences(id) ON DELETE RESTRICT,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, rule_type, rule_key, input_fingerprint, evidence_hash)
);

CREATE INDEX IF NOT EXISTS iris_learning_experiences_user_idx
  ON public.iris_learning_experiences(user_id, learned_at DESC);

CREATE TABLE IF NOT EXISTS public.iris_emergent_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discovery_type text NOT NULL,
  discovery_key text NOT NULL,
  source_fingerprints text[] NOT NULL,
  evidence_hash text NOT NULL,
  discovery_state text NOT NULL CHECK (discovery_state IN ('PROPOSED','VALIDATED','REJECTED','STALE')),
  discovery jsonb NOT NULL,
  support_count integer NOT NULL DEFAULT 1 CHECK (support_count > 0),
  confidence numeric NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  discovered_at timestamptz NOT NULL DEFAULT now(),
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, discovery_type, discovery_key, evidence_hash)
);

CREATE INDEX IF NOT EXISTS iris_emergent_discoveries_user_idx
  ON public.iris_emergent_discoveries(user_id, discovered_at DESC);

ALTER TABLE public.iris_outcome_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iris_outcome_observations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.iris_learning_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iris_learning_experiences FORCE ROW LEVEL SECURITY;
ALTER TABLE public.iris_emergent_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iris_emergent_discoveries FORCE ROW LEVEL SECURITY;

CREATE POLICY iris_outcome_observations_select_own
  ON public.iris_outcome_observations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY iris_learning_experiences_select_own
  ON public.iris_learning_experiences FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY iris_emergent_discoveries_select_own
  ON public.iris_emergent_discoveries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.iris_outcome_observations IS 'Durable externally/financially observed outcomes. Server-authoritative writes only; never synthesized as financial fact.';
COMMENT ON TABLE public.iris_learning_experiences IS 'Durable learning derived only from validated outcome observations. Server-authoritative writes only.';
COMMENT ON TABLE public.iris_emergent_discoveries IS 'Durable higher-order discoveries derived from validated evidence/intelligence/learning. Server-authoritative writes only.';
