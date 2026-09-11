create unique index if not exists iris_semantic_dependency_proofs_execution_capability_uidx
  on public.iris_semantic_dependency_proofs (execution_id, capability_id);

comment on index public.iris_semantic_dependency_proofs_execution_capability_uidx is
  'One semantic dependency proof per execution and capability; proof rows are integrity evidence, not certification.';
