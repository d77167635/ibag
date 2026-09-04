-- Stage 2.2: hash and immutability triggers for balance/liability snapshots.
CREATE OR REPLACE FUNCTION public.set_provider_observation_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.observation_hash := md5(NEW.raw_response::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plaid_raw_balances_hash ON public.plaid_raw_balances;
CREATE TRIGGER trg_plaid_raw_balances_hash
BEFORE INSERT ON public.plaid_raw_balances
FOR EACH ROW EXECUTE FUNCTION public.set_provider_observation_hash();

DROP TRIGGER IF EXISTS trg_plaid_raw_liabilities_hash ON public.plaid_raw_liabilities;
CREATE TRIGGER trg_plaid_raw_liabilities_hash
BEFORE INSERT ON public.plaid_raw_liabilities
FOR EACH ROW EXECUTE FUNCTION public.set_provider_observation_hash();

CREATE OR REPLACE FUNCTION public.prevent_raw_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Raw provider observations are immutable; retain the observation for audit';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.account_id IS DISTINCT FROM OLD.account_id OR
    NEW.raw_response IS DISTINCT FROM OLD.raw_response OR
    NEW.observation_hash IS DISTINCT FROM OLD.observation_hash OR
    NEW.fetched_at IS DISTINCT FROM OLD.fetched_at
  ) THEN
    RAISE EXCEPTION 'Raw provider observation payload and identity are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plaid_raw_balances_immutable ON public.plaid_raw_balances;
CREATE TRIGGER trg_plaid_raw_balances_immutable
BEFORE DELETE OR UPDATE ON public.plaid_raw_balances
FOR EACH ROW EXECUTE FUNCTION public.prevent_raw_snapshot_mutation();

DROP TRIGGER IF EXISTS trg_plaid_raw_liabilities_immutable ON public.plaid_raw_liabilities;
CREATE TRIGGER trg_plaid_raw_liabilities_immutable
BEFORE DELETE OR UPDATE ON public.plaid_raw_liabilities
FOR EACH ROW EXECUTE FUNCTION public.prevent_raw_snapshot_mutation();