-- Correct the governed capability graph to an acyclic execution order.
-- Recursive execution remains supported by the planner; invalid dependency
-- cycles are never treated as executable recursion.
update public.iris_capability_contracts
set dependencies = case capability_id
  when 'temporal' then '[]'::jsonb
  when 'analysis' then '["temporal"]'::jsonb
  when 'behavioral' then '["analysis"]'::jsonb
  when 'pattern' then '["analysis","behavioral"]'::jsonb
  when 'relationship' then '["analysis","behavioral","pattern"]'::jsonb
  when 'anomaly' then '["analysis","temporal","behavioral","pattern"]'::jsonb
  when 'causal' then '["analysis","temporal","behavioral","pattern","relationship"]'::jsonb
  when 'predictive' then '["analysis","temporal","behavioral","pattern","relationship","causal"]'::jsonb
  when 'scenario' then '["predictive","causal","relationship"]'::jsonb
  when 'decision' then '["predictive","causal","relationship","scenario"]'::jsonb
  when 'recommendation' then '["decision","scenario","causal"]'::jsonb
  when 'outcome' then '["predictive","decision","recommendation"]'::jsonb
  when 'learning' then '["decision","recommendation","outcome"]'::jsonb
  when 'emergent' then '["analysis","behavioral","pattern","relationship","causal","predictive","scenario","decision","recommendation","learning","outcome"]'::jsonb
  else dependencies
end
where active = true;
