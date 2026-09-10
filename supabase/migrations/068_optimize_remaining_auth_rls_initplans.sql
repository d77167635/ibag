-- Supabase performance hardening: evaluate auth.uid() once per statement
-- instead of once per row. These policies preserve the existing ownership
-- predicates and only change evaluation strategy.
ALTER POLICY iris_certifications_select_own
  ON public.iris_certifications
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_emergent_discoveries_select_own
  ON public.iris_emergent_discoveries
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_execution_inputs_select_own
  ON public.iris_execution_inputs
  USING (EXISTS (
    SELECT 1
    FROM public.iris_execution_records e
    WHERE e.id = iris_execution_inputs.execution_id
      AND e.user_id = (SELECT auth.uid())
  ));

ALTER POLICY iris_execution_outputs_select_own
  ON public.iris_execution_outputs
  USING (EXISTS (
    SELECT 1
    FROM public.iris_execution_records e
    WHERE e.id = iris_execution_outputs.execution_id
      AND e.user_id = (SELECT auth.uid())
  ));

ALTER POLICY iris_execution_records_select_own
  ON public.iris_execution_records
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_field_lineage_edges_read_own
  ON public.iris_field_lineage_edges
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY iris_intelligence_snapshots_select_own_authenticated
  ON public.iris_intelligence_snapshots
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_learning_experiences_select_own
  ON public.iris_learning_experiences
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_outcome_observations_select_own
  ON public.iris_outcome_observations
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_run_evidence_select_own
  ON public.iris_run_evidence
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_runs_select_own
  ON public.iris_runs
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY iris_source_field_observations_read_own
  ON public.iris_source_field_observations
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY iris_validation_results_select_own
  ON public.iris_validation_results
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY plaid_accounts_select_own_authenticated
  ON public.plaid_accounts
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY plaid_items_select_own_authenticated
  ON public.plaid_items
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY plaid_raw_balances_select_own_authenticated
  ON public.plaid_raw_balances
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY plaid_raw_liabilities_select_own_authenticated
  ON public.plaid_raw_liabilities
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY plaid_raw_transactions_select_own_authenticated
  ON public.plaid_raw_transactions
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY sync_runs_select_own_authenticated
  ON public.sync_runs
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY transactions_select_own_authenticated
  ON public.transactions
  USING (user_id = (SELECT auth.uid()));
