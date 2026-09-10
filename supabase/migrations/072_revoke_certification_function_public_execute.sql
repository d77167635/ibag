revoke execute on function public.finalize_iris_certification(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.iris_certification_immutability_guard() from public, anon, authenticated;
grant execute on function public.finalize_iris_certification(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, text, timestamptz) to service_role;
grant execute on function public.iris_certification_immutability_guard() to service_role;
