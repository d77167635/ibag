-- Iris security hardening: internal SECURITY DEFINER functions must not be
-- callable through the PostgREST RPC surface by anonymous or authenticated
-- clients. These functions are used by server-side triggers/internal writes.
-- Keep execution available only to service_role where the application may need
-- an explicit server-side call; trigger execution is unaffected by EXECUTE ACLs.

revoke all on function public.iris_certification_guard() from public, anon, authenticated;
revoke all on function public.materialize_iris_json_fields(uuid, uuid, uuid, text, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.materialize_iris_source_fields(uuid) from public, anon, authenticated;
revoke all on function public.record_source_field_intelligence_lineage() from public, anon, authenticated;
revoke all on function public.record_transaction_field_lineage() from public, anon, authenticated;
revoke all on function public.trg_materialize_iris_source_fields() from public, anon, authenticated;

-- Explicitly preserve server-side access for functions that may be invoked by
-- the application service role. Trigger execution itself does not depend on
-- these grants.
grant execute on function public.iris_certification_guard() to service_role;
grant execute on function public.materialize_iris_json_fields(uuid, uuid, uuid, text, text, jsonb, text, timestamptz) to service_role;
grant execute on function public.materialize_iris_source_fields(uuid) to service_role;
grant execute on function public.record_source_field_intelligence_lineage() to service_role;
grant execute on function public.record_transaction_field_lineage() to service_role;
grant execute on function public.trg_materialize_iris_source_fields() to service_role;
