import type { IrisAnalysisDefinition } from "./analysisAtlas.js";
import { IRIS_CATALOG, IRIS_CATALOG_EXPANSION } from "./irisCatalog.js";

type CatalogCapability = {
  id: string;
  name: string;
  description: string;
  family: string;
  depth: "core" | "advanced" | "frontier";
  atlas_ids: string[];
};

type TopologyNode = {
  id: string;
  level: "apex" | "domain" | "capability" | "analysis" | "composition" | "synthesis" | "evidence" | "delivery" | "meta";
  name: string;
  parent_ids: string[];
  source_kind: "declared" | "wired" | "evidence_bounded" | "gap";
  atlas_ids: string[];
  evidence_ready: boolean;
};

function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }

/**
 * Maximum-intelligence topology is an architectural audit, not a source of
 * financial facts. It makes the installed intelligence surface explicit and
 * identifies capabilities that are catalogued but not yet backed by an atlas
 * definition. It never treats a declared capability as executed intelligence.
 */
export function buildMaximumIntelligenceTopology(input: {
  atlas: { definitions: IrisAnalysisDefinition[] };
  composition: any;
  higherOrderSynthesis: any;
  metaIntelligence: any;
  sourceFidelity: any;
}) {
  const atlas = input.atlas.definitions;
  const catalog: CatalogCapability[] = [...IRIS_CATALOG, ...IRIS_CATALOG_EXPANSION];
  const nodes: TopologyNode[] = [];

  nodes.push({ id: "iris", level: "apex", name: "Iris", parent_ids: [], source_kind: "wired", atlas_ids: [], evidence_ready: true });

  const families = unique([...catalog.map(c => c.family), ...atlas.map(a => a.family)]);
  for (const family of families) {
    nodes.push({ id: `domain:${family}`, level: "domain", name: family, parent_ids: ["iris"], source_kind: "declared", atlas_ids: atlas.filter(a => a.family === family).map(a => a.id), evidence_ready: atlas.some(a => a.family === family && a.inputs.every(k => input.atlas.definitions.some(x => x.id === a.id && x.inputs.includes(k)))) });
  }

  for (const capability of catalog) {
    const definitions = capability.atlas_ids.map(id => atlas.find(a => a.id === id)).filter(Boolean) as IrisAnalysisDefinition[];
    const wired = definitions.length > 0;
    nodes.push({ id: `capability:${capability.id}`, level: "capability", name: capability.name, parent_ids: [`domain:${capability.family}`], source_kind: wired ? "evidence_bounded" : "gap", atlas_ids: definitions.map(d => d.id), evidence_ready: definitions.some(d => d.inputs.length > 0 && d.inputs.every(input => input in (input as any))) });
  }

  for (const definition of atlas) {
    const capabilityParent = catalog.find(c => c.atlas_ids.includes(definition.id));
    const parent = capabilityParent ? `capability:${capabilityParent.id}` : `domain:${definition.family}`;
    nodes.push({ id: `analysis:${definition.id}`, level: "analysis", name: definition.name, parent_ids: [parent], source_kind: "wired", atlas_ids: [definition.id], evidence_ready: (input.atlas as any).definitions.find((d: any) => d.id === definition.id)?.evidence_ready === true });
  }

  const compositionCount = Number(input.composition?.counts?.evidence_ready_combinations ?? 0);
  const possibleCount = Number(input.composition?.counts?.possible_combinations ?? 0);
  nodes.push({ id: "composition:relational", level: "composition", name: "Evidence-valid relational composition", parent_ids: ["iris"], source_kind: compositionCount > 0 ? "evidence_bounded" : "gap", atlas_ids: [], evidence_ready: compositionCount > 0 });
  nodes.push({ id: "composition:layered", level: "composition", name: "Layer composition", parent_ids: ["iris"], source_kind: Number(input.composition?.counts?.evidence_ready_combinations ?? 0) > 0 ? "evidence_bounded" : "gap", atlas_ids: [], evidence_ready: Number(input.composition?.counts?.evidence_ready_combinations ?? 0) > 0 });
  nodes.push({ id: "synthesis:higher-order", level: "synthesis", name: "Higher-order synthesis", parent_ids: ["iris"], source_kind: input.higherOrderSynthesis ? "wired" : "gap", atlas_ids: [], evidence_ready: Boolean(input.higherOrderSynthesis) });
  nodes.push({ id: "synthesis:meta", level: "meta", name: "Meta-intelligence", parent_ids: ["iris"], source_kind: input.metaIntelligence ? "wired" : "gap", atlas_ids: [], evidence_ready: Boolean(input.metaIntelligence) });
  nodes.push({ id: "evidence:boundary", level: "evidence", name: "Certified evidence boundary", parent_ids: ["iris"], source_kind: input.sourceFidelity ? "evidence_bounded" : "gap", atlas_ids: [], evidence_ready: Boolean(input.sourceFidelity) });
  nodes.push({ id: "delivery:iris", level: "delivery", name: "Iris user-facing intelligence delivery", parent_ids: ["iris"], source_kind: "wired", atlas_ids: [], evidence_ready: true });

  const gaps = nodes.filter(n => n.source_kind === "gap").map(n => ({ id: n.id, level: n.level, name: n.name }));
  const catalogBacked = catalog.filter(c => c.atlas_ids.some(id => atlas.some(a => a.id === id))).length;
  const capabilityCoverage = catalog.length ? catalogBacked / catalog.length : 1;
  const analysisReady = atlas.filter((a: any) => a.evidence_ready === true).length;
  const topologyScore = Math.round(((catalogBacked / Math.max(1, catalog.length)) * 0.35 + (analysisReady / Math.max(1, atlas.length)) * 0.35 + (compositionCount > 0 ? 1 : 0) * 0.15 + (possibleCount >= compositionCount ? 1 : 0) * 0.05 + (input.higherOrderSynthesis ? 1 : 0) * 0.05 + (input.metaIntelligence ? 1 : 0) * 0.05) * 100) / 100;

  return {
    architecture_version: "IRIS_MAXIMUM_INTELLIGENCE_TOPOLOGY_V1",
    principle: "Maximize intelligence topology, not the number of screens or engines.",
    hierarchy: "Iris > domains > capabilities > analyses > evidence-valid compositions > higher-order synthesis > meta-intelligence > user delivery",
    levels: ["apex", "domain", "capability", "analysis", "composition", "synthesis", "evidence", "delivery", "meta"],
    nodes,
    coverage: {
      catalog_capabilities: catalog.length,
      catalog_capabilities_backed_by_atlas: catalogBacked,
      catalog_capability_coverage: Number(capabilityCoverage.toFixed(4)),
      atlas_analyses: atlas.length,
      atlas_evidence_ready: analysisReady,
      atlas_evidence_limited: atlas.length - analysisReady,
      evidence_ready_compositions: compositionCount,
      possible_compositions: possibleCount,
      topology_score: topologyScore,
    },
    gaps,
    integrity_rules: [
      "Declared capability is not equivalent to runtime execution.",
      "Atlas definition is not equivalent to actual field consumption.",
      "Evidence-ready is not equivalent to factual certainty beyond the stated evidence boundary.",
      "A composition is not an observed financial fact.",
      "Missing provider evidence remains missing; Iris never fabricates it.",
      "User-facing delivery must expose applicable intelligence contextually rather than require one screen per capability.",
    ],
    certification: {
      status: gaps.length === 0 ? "structurally_complete" : "structural_gaps_present",
      runtime_execution_verified: false,
      field_level_consumption_verified: false,
      full_production_certification: false,
      reason: "Topology establishes and audits the architecture; independent runtime and exact field-consumption verification are still required for a 100% claim.",
    },
  };
}
