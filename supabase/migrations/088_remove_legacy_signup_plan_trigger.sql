-- Iris authentication must not depend on a legacy plan catalog.
-- A new auth.users row is valid when its Iris profile is created; plan/entitlement
-- activation belongs to the governed Iris feature/entitlement system and must not
-- be injected by the auth trigger.

drop trigger if exists profiles_assign_default_ibag_plan on public.profiles;
drop function if exists public.assign_default_ibag_plan();
