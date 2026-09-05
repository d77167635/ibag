-- Remove the legacy duplicate unique index created by migration 039.
-- Migration 040 establishes the canonical dedupe index named iris_product_consumption_dedupe_idx.
drop index if exists public.iris_product_consumption_dedupe_uidx;
