-- Governed validation/promotion for the durable learning loop.
-- Promotion is explicit and server-authoritative. It never synthesizes financial data.

CREATE OR REPLACE FUNCTION public.validate_iris_learning_experience(p_experience_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  experience public.iris_learning_experiences%ROWTYPE;
  outcome public.iris_outcome_observations%ROWTYPE;
BEGIN
  SELECT * INTO experience
  FROM public.iris_learning_experiences
  WHERE id = p_experience_id;

  IF NOT FOUND OR experience.learning_state <> 'PROPOSED' THEN
    RETURN false;
  END IF;

  SELECT * INTO outcome
  FROM public.iris_outcome_observations
  WHERE id = experience.outcome_id
    AND user_id = experience.user_id
    AND outcome_state = 'VALIDATED'
    AND evidence_hash = experience.evidence_hash;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF experience.rule_type <> 'validated_outcome_presence'
     OR experience.rule_key <> outcome.outcome_type
     OR experience.learned_value <> '{"observed": true}'::jsonb THEN
    RETURN false;
  END IF;

  UPDATE public.iris_learning_experiences
  SET learning_state = 'VALIDATED',
      validation = jsonb_build_object(
        'validated_by', 'governed_database_rule',
        'validated_at', now(),
        'source_outcome_id', outcome.id,
        'source_outcome_state', outcome.outcome_state,
        'source_evidence_hash', outcome.evidence_hash
      )
  WHERE id = p_experience_id
    AND learning_state = 'PROPOSED';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_iris_emergent_discovery(p_discovery_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  discovery_row public.iris_emergent_discoveries%ROWTYPE;
  matched_count integer;
  required_count integer;
  discovery_outcome_type text;
BEGIN
  SELECT * INTO discovery_row
  FROM public.iris_emergent_discoveries
  WHERE id = p_discovery_id;

  IF NOT FOUND OR discovery_row.discovery_state <> 'PROPOSED' THEN
    RETURN false;
  END IF;

  IF discovery_row.discovery_type <> 'repeated_validated_outcome_type'
     OR discovery_row.support_count < 2
     OR jsonb_typeof(discovery_row.discovery) <> 'object'
     OR (discovery_row.discovery ->> 'repeated') <> 'true' THEN
    RETURN false;
  END IF;

  discovery_outcome_type := discovery_row.discovery ->> 'outcome_type';
  IF discovery_outcome_type IS NULL
     OR discovery_row.discovery_key <> ('validated_outcome_presence:' || discovery_outcome_type) THEN
    RETURN false;
  END IF;

  SELECT count(DISTINCT fp)::integer, cardinality(discovery_row.source_fingerprints)
  INTO matched_count, required_count
  FROM unnest(discovery_row.source_fingerprints) AS fp
  JOIN public.iris_learning_experiences le
    ON le.user_id = discovery_row.user_id
   AND le.input_fingerprint = fp
   AND le.learning_state = 'VALIDATED'
   AND le.rule_type = 'validated_outcome_presence'
   AND le.rule_key = discovery_outcome_type;

  IF required_count < 2 OR matched_count <> required_count THEN
    RETURN false;
  END IF;

  IF discovery_row.support_count <> required_count THEN
    RETURN false;
  END IF;

  UPDATE public.iris_emergent_discoveries
  SET discovery_state = 'VALIDATED',
      validation = jsonb_build_object(
        'validated_by', 'governed_database_rule',
        'validated_at', now(),
        'supporting_learning_count', matched_count,
        'discovery_type', discovery_row.discovery_type,
        'discovery_key', discovery_row.discovery_key
      )
  WHERE id = p_discovery_id
    AND discovery_state = 'PROPOSED';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_iris_learning_experience(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_iris_emergent_discovery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_iris_learning_experience(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_iris_emergent_discovery(uuid) TO service_role;

COMMENT ON FUNCTION public.validate_iris_learning_experience(uuid) IS 'Explicit server-authoritative validation of a proposed learning experience against its still-validated source outcome; never creates financial data.';
COMMENT ON FUNCTION public.validate_iris_emergent_discovery(uuid) IS 'Explicit server-authoritative validation of a proposed emergent discovery against its validated learning support set; never creates financial data.';
