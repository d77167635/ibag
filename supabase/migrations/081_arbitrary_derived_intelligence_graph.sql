-- Iris arbitrary derived-intelligence graph layer.
-- Adds semantic identity and explicit upstream/recursive ancestry metadata to
-- graph nodes without creating any financial observations or seed data.

alter table public.iris_user_intelligence_nodes
  add column if not exists intelligence_key text,
  add column if not exists intelligence_name text,
  add column if not exists derivation_operator text,
  add column if not exists derivation_version text,
  add column if not exists upstream_node_ids uuid[] not null default '{}'::uuid[],
  add column if not exists recursive_ancestry uuid[] not null default '{}'::uuid[];

create index if not exists idx_iris_user_intel_nodes_intelligence_key
  on public.iris_user_intelligence_nodes (user_id, intelligence_key)
  where intelligence_key is not null;

create index if not exists idx_iris_user_intel_nodes_upstream
  on public.iris_user_intelligence_nodes using gin (upstream_node_ids);

create index if not exists idx_iris_user_intel_nodes_ancestry
  on public.iris_user_intelligence_nodes using gin (recursive_ancestry);

comment on column public.iris_user_intelligence_nodes.intelligence_key is
  'Stable semantic identity for a derived intelligence node; independent of the finite governed capability registry.';
comment on column public.iris_user_intelligence_nodes.intelligence_name is
  'Human-readable semantic name supplied by the derivation definition; not evidence.';
comment on column public.iris_user_intelligence_nodes.derivation_operator is
  'Operator or transformation identity that produced the derived node.';
comment on column public.iris_user_intelligence_nodes.derivation_version is
  'Version of the derivation contract/operator used to produce the node.';
comment on column public.iris_user_intelligence_nodes.upstream_node_ids is
  'Exact persisted graph node UUIDs consumed by this derived node.';
comment on column public.iris_user_intelligence_nodes.recursive_ancestry is
  'Transitive persisted graph ancestry known at derivation time; never a semantic depth limit.';
