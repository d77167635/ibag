-- Stage 2.1: database-enforced ownership and provider-lineage integrity.
-- Preconditions verified against live data before applying: zero ownership,
-- orphan, duplicate-provider, and transaction/raw identity violations.
-- This migration adds only constraints; it does not alter financial values.

ALTER TABLE public.plaid_items
  ADD CONSTRAINT plaid_items_id_user_key UNIQUE (id, user_id);

ALTER TABLE public.plaid_accounts
  ADD CONSTRAINT plaid_accounts_id_user_key UNIQUE (id, user_id),
  ADD CONSTRAINT plaid_accounts_item_user_fk
    FOREIGN KEY (item_id, user_id)
    REFERENCES public.plaid_items (id, user_id)
    ON DELETE CASCADE;

ALTER TABLE public.plaid_raw_transactions
  ADD CONSTRAINT plaid_raw_tx_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES public.plaid_accounts (id, user_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT plaid_raw_tx_id_user_provider_key
    UNIQUE (id, user_id, plaid_transaction_id);

ALTER TABLE public.plaid_raw_balances
  ADD CONSTRAINT plaid_raw_balances_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES public.plaid_accounts (id, user_id)
    ON DELETE CASCADE;

ALTER TABLE public.plaid_raw_liabilities
  ADD CONSTRAINT plaid_raw_liabilities_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES public.plaid_accounts (id, user_id)
    ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES public.plaid_accounts (id, user_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT transactions_raw_identity_fk
    FOREIGN KEY (raw_transaction_id, user_id, plaid_transaction_id)
    REFERENCES public.plaid_raw_transactions (id, user_id, plaid_transaction_id)
    ON DELETE RESTRICT;

ALTER TABLE public.card_roundup_ledger
  ADD CONSTRAINT card_roundup_ledger_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES public.plaid_accounts (id, user_id)
    ON DELETE CASCADE;

ALTER TABLE public.roundup_sweep_events
  ADD CONSTRAINT roundup_sweep_events_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES public.plaid_accounts (id, user_id)
    ON DELETE CASCADE;

ALTER TABLE public.liability_details
  ADD CONSTRAINT liability_details_account_user_fk
    FOREIGN KEY (account_id, user_id)
    REFERENCES public.plaid_accounts (id, user_id)
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT plaid_accounts_item_user_fk ON public.plaid_accounts IS
  'Prevents an account from belonging to a different user than its Plaid Item.';
COMMENT ON CONSTRAINT plaid_raw_tx_account_user_fk ON public.plaid_raw_transactions IS
  'Prevents a raw transaction observation from crossing account ownership boundaries.';
COMMENT ON CONSTRAINT transactions_account_user_fk ON public.transactions IS
  'Prevents a normalized transaction from crossing account ownership boundaries.';
COMMENT ON CONSTRAINT transactions_raw_identity_fk ON public.transactions IS
  'Binds normalized transaction ownership and provider identity to its raw observation.';
