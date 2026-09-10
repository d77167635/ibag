-- Remove duplicate read policy and identical supporting indexes discovered by
-- the Supabase performance advisor. This is additive hardening and does not
-- change the authoritative lineage data model.
DROP POLICY IF EXISTS iris_source_field_intelligence_bindings_read
  ON public.iris_source_field_intelligence_bindings;

DROP INDEX IF EXISTS public.iris_source_field_intel_binding_node_idx;
DROP INDEX IF EXISTS public.iris_source_field_intel_binding_source_idx;
