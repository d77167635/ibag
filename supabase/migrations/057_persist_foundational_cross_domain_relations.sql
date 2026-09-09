-- Persist explicit foundational cross-domain ontology relationships.
-- These are structural relationships between intelligence domains, not user-specific facts.

with relations(from_key,to_key,meaning) as (
  values
    ('identity','auth','identity contextualizes the authorized financial connection'),
    ('auth','transactions','authorized connection scopes transaction evidence'),
    ('auth','balance','authorized connection scopes balance evidence'),
    ('transactions','balance','transaction activity contextualizes account balance state'),
    ('transactions','liabilities','transaction activity can contextualize liability payments and servicing'),
    ('transactions','investments','transaction activity can contextualize investment funding and activity'),
    ('transactions','assets','transaction activity can contextualize asset-related financial activity'),
    ('balance','liabilities','liability obligations contextualize available financial capacity'),
    ('balance','investments','cash and investment balances jointly contextualize financial position'),
    ('balance','assets','account balances contextualize liquid financial position alongside assets'),
    ('statements','transactions','statements can corroborate transaction-period evidence'),
    ('statements','balance','statements can corroborate balance-period evidence'),
    ('statements','liabilities','statements can corroborate liability-period evidence'),
    ('statements','investments','statements can corroborate investment-period evidence')
)
insert into public.iris_intelligence_edges(from_node_id,to_node_id,relation,metadata)
select from_node.id,to_node.id,'cross_domain',jsonb_build_object('ontology_version','IRIS_FOUNDATIONAL_CROSS_DOMAIN_V1','meaning',r.meaning)
from relations r
join public.iris_intelligence_nodes from_node on from_node.key=r.from_key and from_node.node_type='domain' and from_node.active=true
join public.iris_intelligence_nodes to_node on to_node.key=r.to_key and to_node.node_type='domain' and to_node.active=true
on conflict do nothing;
