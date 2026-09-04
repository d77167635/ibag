-- The default-plan function is trigger-only. It must not be callable through PostgREST RPC.
-- Keep SECURITY DEFINER for the profile trigger, but expose no EXECUTE privilege to API roles.
revoke execute on function public.assign_default_ibag_plan() from anon;
revoke execute on function public.assign_default_ibag_plan() from authenticated;
revoke execute on function public.assign_default_ibag_plan() from public;
