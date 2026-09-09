-- Persist the governed recursive intelligence capability graph as first-class Iris nodes.
-- This is ontology metadata only; it creates no user financial evidence.

with layer_rows(key,label,description) as (
  values
    ('analysis','Analytical Intelligence','Transforms certified canonical financial state into explicit analytical findings.'),
    ('temporal','Temporal Intelligence','Reasons about time, windows, recency, change, sequence, and trajectory.'),
    ('behavioral','Behavioral Intelligence','Identifies evidence-backed behavioral regularities and user-specific patterns.'),
    ('pattern','Pattern Intelligence','Detects recurring, correlated, clustered, and structural financial patterns.'),
    ('relationship','Relational Intelligence','Reasons across entities, domains, dependencies, and financial relationships.'),
    ('anomaly','Anomaly Intelligence','Detects unusual observations or changes relative to governed baselines.'),
    ('causal','Causal Intelligence','Evaluates defensible causal or contributing explanations without overstating causality.'),
    ('predictive','Predictive Intelligence','Produces evidence-qualified forecasts and trajectories.'),
    ('scenario','Scenario Intelligence','Evaluates governed what-if and counterfactual financial scenarios.'),
    ('decision','Decision Intelligence','Compares evidence-supported choices and consequences.'),
    ('recommendation','Recommendation Intelligence','Produces constrained, evidence-supported options and recommendations.'),
    ('outcome','Outcome Intelligence','Observes outcomes of decisions and compares them with expected consequences.'),
    ('learning','Learning Intelligence','Uses verified outcomes to improve future reasoning and user-specific intelligence.'),
    ('emergent','Emergent Intelligence','Synthesizes higher-order discoveries from governed lower-order intelligence.')
)
insert into public.iris_intelligence_nodes(key,label,node_type,description,domain_key,metadata,active)
select key,label,'intelligence',description,'iris',jsonb_build_object('capability_id',key,'graph_role','recursive_intelligence_layer','graph_version','IRIS_RECURSIVE_LAYER_GRAPH_V1'),true
from layer_rows
on conflict (key) do update set label=excluded.label,node_type=excluded.node_type,description=excluded.description,domain_key=excluded.domain_key,metadata=excluded.metadata,active=excluded.active;

with layer_keys(key) as (values ('analysis'),('temporal'),('behavioral'),('pattern'),('relationship'),('anomaly'),('causal'),('predictive'),('scenario'),('decision'),('recommendation'),('outcome'),('learning'),('emergent'))
insert into public.iris_intelligence_edges(from_node_id,to_node_id,relation,metadata)
select root.id,layer.id,'governs',jsonb_build_object('graph_version','IRIS_RECURSIVE_LAYER_GRAPH_V1')
from public.iris_intelligence_nodes root join layer_keys layer_key on true join public.iris_intelligence_nodes layer on layer.key=layer_key.key and layer.node_type='intelligence' where root.key='iris'
on conflict do nothing;

with dependency_rows(from_key,to_key) as (values
('analysis','temporal'),('behavioral','analysis'),('pattern','analysis'),('pattern','behavioral'),('relationship','analysis'),('relationship','behavioral'),('relationship','pattern'),('anomaly','analysis'),('anomaly','temporal'),('anomaly','behavioral'),('anomaly','pattern'),('causal','analysis'),('causal','temporal'),('causal','behavioral'),('causal','pattern'),('causal','relationship'),('predictive','analysis'),('predictive','temporal'),('predictive','behavioral'),('predictive','pattern'),('predictive','relationship'),('predictive','causal'),('scenario','predictive'),('scenario','causal'),('scenario','relationship'),('decision','predictive'),('decision','causal'),('decision','relationship'),('decision','scenario'),('recommendation','decision'),('recommendation','scenario'),('recommendation','causal'),('outcome','predictive'),('outcome','decision'),('outcome','recommendation'),('learning','decision'),('learning','recommendation'),('learning','outcome'),('emergent','analysis'),('emergent','behavioral'),('emergent','pattern'),('emergent','relationship'),('emergent','causal'),('emergent','predictive'),('emergent','scenario'),('emergent','decision'),('emergent','recommendation'),('emergent','learning'),('emergent','outcome'))
insert into public.iris_intelligence_edges(from_node_id,to_node_id,relation,metadata)
select from_node.id,to_node.id,'derives_from',jsonb_build_object('graph_version','IRIS_RECURSIVE_LAYER_GRAPH_V1')
from dependency_rows d join public.iris_intelligence_nodes from_node on from_node.key=d.from_key and from_node.node_type='intelligence' join public.iris_intelligence_nodes to_node on to_node.key=d.to_key and to_node.node_type='intelligence'
on conflict do nothing;
