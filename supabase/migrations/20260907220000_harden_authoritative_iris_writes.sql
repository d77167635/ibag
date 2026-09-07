-- Iris authoritative-state write boundary
-- Browser/authenticated clients may read their own authoritative records,
-- but may not create or mutate evidence, canonical financial state,
-- intelligence execution, validation, certification, lineage, or snapshots.
-- Server-side service_role remains the authoritative writer.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'plaid_items',
    'plaid_accounts',
    'plaid_raw_transactions',
    'plaid_raw_balances',
    'plaid_raw_liabilities',
    'transactions',
    'sync_runs',
    'iris_runs',
    'iris_run_evidence',
    'iris_execution_records',
    'iris_execution_inputs',
    'iris_execution_outputs',
    'iris_validation_results',
    'iris_certifications',
    'iris_data_lineage',
    'iris_intelligence_snapshots',
    'iris_product_consumption'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Remove broad browser-write policies from authoritative financial/intelligence state.
DROP POLICY IF EXISTS plaid_items_owner_all ON public.plaid_items;
DROP POLICY IF EXISTS plaid_accounts_owner_all ON public.plaid_accounts;
DROP POLICY IF EXISTS plaid_raw_tx_owner_all ON public.plaid_raw_transactions;
DROP POLICY IF EXISTS plaid_raw_bal_owner_all ON public.plaid_raw_balances;
DROP POLICY IF EXISTS plaid_raw_liab_owner_all ON public.plaid_raw_liabilities;
DROP POLICY IF EXISTS transactions_owner_all ON public.transactions;
DROP POLICY IF EXISTS sync_runs_owner_all ON public.sync_runs;
DROP POLICY IF EXISTS iris_intelligence_snapshots_owner_all ON public.iris_intelligence_snapshots;

-- Explicit authenticated read boundaries. No INSERT/UPDATE/DELETE policies are created.
CREATE POLICY plaid_items_select_own_authenticated
  ON public.plaid_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY plaid_accounts_select_own_authenticated
  ON public.plaid_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY plaid_raw_transactions_select_own_authenticated
  ON public.plaid_raw_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY plaid_raw_balances_select_own_authenticated
  ON public.plaid_raw_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY plaid_raw_liabilities_select_own_authenticated
  ON public.plaid_raw_liabilities FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY transactions_select_own_authenticated
  ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY sync_runs_select_own_authenticated
  ON public.sync_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY iris_intelligence_snapshots_select_own_authenticated
  ON public.iris_intelligence_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Explicitly preserve read-only access already intended for execution/certification records.
-- These tables intentionally have no authenticated INSERT/UPDATE/DELETE policies.

COMMENT ON TABLE public.iris_runs IS
  'Authoritative Iris execution runs. Server-authoritative writes only; authenticated users may read their own runs.';
COMMENT ON TABLE public.iris_execution_records IS
  'Authoritative Iris execution records. Server-authoritative writes only.';
COMMENT ON TABLE public.iris_validation_results IS
  'Authoritative Iris validation results. Server-authoritative writes only.';
COMMENT ON TABLE public.iris_certifications IS
  'Authoritative Iris certifications. Server-authoritative writes only.';
COMMENT ON TABLE public.iris_data_lineage IS
  'Authoritative Iris lineage. Server-authoritative writes only.';
