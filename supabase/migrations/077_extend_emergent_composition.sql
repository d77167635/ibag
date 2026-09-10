-- Extend recursive emergent synthesis to consume higher-order risk,
-- opportunity, and consequence capabilities. No financial data is created.
update public.iris_capability_contracts
set dependencies = '["analysis","behavioral","pattern","relationship","causal","predictive","scenario","decision","recommendation","risk","opportunity","consequence","learning","outcome","financial_life_state","relational_ontology"]'::jsonb
where capability_id = 'emergent' and version = '1.1.0';