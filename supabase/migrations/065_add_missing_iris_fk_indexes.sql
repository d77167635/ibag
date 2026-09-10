-- Cover foreign keys introduced by the evidence/learning lineage graph.
-- These are additive and preserve the existing clean-slate transition boundary.

CREATE INDEX IF NOT EXISTS iris_field_lineage_edges_item_id_idx
  ON public.iris_field_lineage_edges(item_id);

CREATE INDEX IF NOT EXISTS iris_learning_experiences_outcome_id_idx
  ON public.iris_learning_experiences(outcome_id);

CREATE INDEX IF NOT EXISTS iris_learning_experiences_supersedes_id_idx
  ON public.iris_learning_experiences(supersedes_id);

CREATE INDEX IF NOT EXISTS iris_outcome_observations_run_id_idx
  ON public.iris_outcome_observations(run_id);

CREATE INDEX IF NOT EXISTS plaid_provider_response_receipts_user_id_idx
  ON public.plaid_provider_response_receipts(user_id);
