-- Preserve a deterministic integrity fingerprint for every stored raw Plaid
-- product response. This does not alter the provider payload; it makes any
-- accidental mutation detectable by the governance layer.
alter table public.plaid_raw_product_observations
  add column if not exists observation_hash text;

update public.plaid_raw_product_observations
set observation_hash = md5(raw_response::text)
where observation_hash is null;

create or replace function public.set_plaid_raw_product_observation_hash()
returns trigger
language plpgsql
as $$
begin
  new.observation_hash := md5(new.raw_response::text);
  return new;
end;
$$;

drop trigger if exists trg_plaid_raw_product_observation_hash
  on public.plaid_raw_product_observations;

create trigger trg_plaid_raw_product_observation_hash
before insert or update of raw_response
on public.plaid_raw_product_observations
for each row
execute function public.set_plaid_raw_product_observation_hash();
