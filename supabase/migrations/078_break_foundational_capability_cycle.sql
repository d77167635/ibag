-- Break the accidental foundational capability cycle.
-- Financial life state is foundational and executable from canonical evidence;
-- relational ontology may consume that state, but financial life state does not
-- require relational ontology as a prerequisite. Cycle detection must remain
-- authoritative rather than being bypassed by the executor.

update public.iris_capability_contracts
set dependencies = '[]'::jsonb
where capability_id = 'financial_life_state'
  and active = true;

update public.iris_capability_contracts
set dependencies = '["financial_life_state"]'::jsonb
where capability_id = 'relational_ontology'
  and active = true;
