-- Stage 2.3/2.4/2.7: durable sync state, persisted transaction semantics,
-- provider evidence metadata, and explicit Plaid product-domain lifecycle.

ALTER TABLE public.plaid_raw_transactions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'plaid',
  ADD COLUMN IF NOT EXISTS provider_object_id text,
  ADD COLUMN IF NOT EXISTS effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS evidence_state text NOT NULL DEFAULT 'observed',
  ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.plaid_raw_balances
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'plaid',
  ADD COLUMN IF NOT EXISTS provider_object_id text,
  ADD COLUMN IF NOT EXISTS effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS evidence_state text NOT NULL DEFAULT 'observed',
  ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS observation_version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.plaid_raw_liabilities
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'plaid',
  ADD COLUMN IF NOT EXISTS provider_object_id text,
  ADD COLUMN IF NOT EXISTS effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS acquired_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS evidence_state text NOT NULL DEFAULT 'observed',
  ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS observation_version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.plaid_raw_transactions
  ADD CONSTRAINT plaid_raw_transactions_evidence_state_ck
  CHECK (evidence_state IN ('observed','calculated','inferred','limited','insufficient_evidence','retired'));
ALTER TABLE public.plaid_raw_balances
  ADD CONSTRAINT plaid_raw_balances_evidence_state_ck
  CHECK (evidence_state IN ('observed','calculated','inferred','limited','insufficient_evidence','retired'));
ALTER TABLE public.plaid_raw_liabilities
  ADD CONSTRAINT plaid_raw_liabilities_evidence_state_ck
  CHECK (evidence_state IN ('observed','calculated','inferred','limited','insufficient_evidence','retired'));

UPDATE public.plaid_raw_transactions
SET provider_object_id = plaid_transaction_id,
    effective_at = COALESCE(effective_at, fetched_at),
    acquired_at = COALESCE(acquired_at, fetched_at),
    provenance = jsonb_build_object('provider','plaid','object_id',plaid_transaction_id)
WHERE provider_object_id IS NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_class text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS classification_evidence text NOT NULL DEFAULT 'insufficient_evidence',
  ADD COLUMN IF NOT EXISTS classification_version text NOT NULL DEFAULT 'TRANSACTION_CLASS_V1',
  ADD COLUMN IF NOT EXISTS classified_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_class_ck
  CHECK (transaction_class IN ('purchase','transfer','income','refund','fee','debt_payment','unknown'));
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_classification_evidence_ck
  CHECK (classification_evidence IN ('observed','calculated','inferred','insufficient_evidence'));

UPDATE public.transactions
SET transaction_class = CASE
  WHEN amount < 0 AND plaid_category_detailed ILIKE '%REFUND%' THEN 'refund'
  WHEN plaid_category_primary IN ('TRANSFER_IN','TRANSFER_OUT') THEN 'transfer'
  WHEN amount < 0 AND plaid_category_primary = 'INCOME' THEN 'income'
  WHEN amount > 0 AND plaid_category_primary = 'BANK_FEES' THEN 'fee'
  WHEN amount > 0 AND (plaid_category_primary = 'LOAN_PAYMENTS' OR plaid_category_detailed ILIKE '%CREDIT_CARD_PAYMENT%') THEN 'debt_payment'
  WHEN amount > 0 AND plaid_category_detailed IS NOT NULL THEN 'purchase'
  ELSE 'unknown'
END,
classification_evidence = CASE
  WHEN plaid_category_primary IN ('TRANSFER_IN','TRANSFER_OUT','INCOME','BANK_FEES','LOAN_PAYMENTS')
    OR plaid_category_detailed ILIKE '%REFUND%'
    OR plaid_category_detailed ILIKE '%CREDIT_CARD_PAYMENT%'
    OR plaid_category_detailed IS NOT NULL
    THEN 'calculated'
  ELSE 'insufficient_evidence'
END,
classified_at = now()
WHERE classification_version = 'TRANSACTION_CLASS_V1';

CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  item_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'requested',
  idempotency_key text NOT NULL UNIQUE,
  cursor text,
  pages_processed integer NOT NULL DEFAULT 0,
  added_count integer NOT NULL DEFAULT 0,
  modified_count integer NOT NULL DEFAULT 0,
  removed_count integer NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  last_checkpoint_at timestamptz,
  completed_at timestamptz
);
ALTER TABLE public.sync_runs
  ADD CONSTRAINT sync_runs_state_ck
  CHECK (state IN ('requested','authorized','started','provider_fetching','receiving','validating','normalizing','reconciling','committing','intelligence_refresh','validated','completed','failed','retryable'));
ALTER TABLE public.sync_runs
  ADD CONSTRAINT sync_runs_item_user_fk
  FOREIGN KEY (item_id, user_id) REFERENCES public.plaid_items(id, user_id);

CREATE INDEX IF NOT EXISTS sync_runs_item_state_idx ON public.sync_runs(item_id, state, requested_at DESC);
CREATE INDEX IF NOT EXISTS sync_runs_user_requested_idx ON public.sync_runs(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS transactions_class_idx ON public.transactions(user_id, transaction_class);
CREATE INDEX IF NOT EXISTS plaid_raw_tx_provider_object_idx ON public.plaid_raw_transactions(user_id, provider_object_id, is_current);

CREATE TABLE IF NOT EXISTS public.plaid_product_observations (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  item_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'plaid',
  product text NOT NULL,
  lifecycle_state text NOT NULL,
  billed boolean,
  available boolean,
  authorized boolean,
  observed_at timestamptz NOT NULL DEFAULT now(),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.plaid_product_observations
  ADD CONSTRAINT plaid_product_observations_item_user_fk
  FOREIGN KEY (item_id, user_id) REFERENCES public.plaid_items(id, user_id);
ALTER TABLE public.plaid_product_observations
  ADD CONSTRAINT plaid_product_observations_state_ck
  CHECK (lifecycle_state IN ('unsupported','available','authorized','observed','validated','fresh','stale','not_requested','not_connected'));
CREATE INDEX IF NOT EXISTS plaid_product_observations_current_idx
  ON public.plaid_product_observations(user_id, item_id, product, observed_at DESC);

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_product_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sync_runs_owner_all ON public.sync_runs;
CREATE POLICY sync_runs_owner_all ON public.sync_runs FOR ALL TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS plaid_product_observations_owner_all ON public.plaid_product_observations;
CREATE POLICY plaid_product_observations_owner_all ON public.plaid_product_observations FOR ALL TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

REVOKE EXECUTE ON FUNCTION public.record_plaid_transaction_observation(uuid,uuid,text,jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.retire_plaid_transaction_observation(uuid,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

ALTER FUNCTION public.set_provider_observation_hash() SET search_path = public, extensions;
ALTER FUNCTION public.prevent_raw_snapshot_mutation() SET search_path = public, extensions;
ALTER FUNCTION public.prevent_raw_observation_mutation() SET search_path = public, extensions;

CREATE INDEX IF NOT EXISTS card_roundup_ledger_user_idx ON public.card_roundup_ledger(user_id);
CREATE INDEX IF NOT EXISTS card_roundup_ledger_account_user_idx ON public.card_roundup_ledger(account_id, user_id);
CREATE INDEX IF NOT EXISTS liability_details_account_user_idx ON public.liability_details(account_id, user_id);
CREATE INDEX IF NOT EXISTS category_mapping_subdomain_idx ON public.category_mapping(subdomain_id);
CREATE INDEX IF NOT EXISTS merchant_aliases_merchant_idx ON public.merchant_aliases(merchant_id);
CREATE INDEX IF NOT EXISTS plaid_accounts_item_idx ON public.plaid_accounts(item_id);
CREATE INDEX IF NOT EXISTS plaid_accounts_item_user_idx ON public.plaid_accounts(item_id, user_id);
CREATE INDEX IF NOT EXISTS plaid_raw_balances_account_user_idx ON public.plaid_raw_balances(account_id, user_id);
CREATE INDEX IF NOT EXISTS plaid_raw_liabilities_account_user_idx ON public.plaid_raw_liabilities(account_id, user_id);
CREATE INDEX IF NOT EXISTS plaid_raw_transactions_account_user_idx ON public.plaid_raw_transactions(account_id, user_id);
CREATE INDEX IF NOT EXISTS roundup_sweep_events_account_user_idx ON public.roundup_sweep_events(account_id, user_id);
CREATE INDEX IF NOT EXISTS transactions_raw_identity_idx ON public.transactions(raw_transaction_id, user_id, plaid_transaction_id);