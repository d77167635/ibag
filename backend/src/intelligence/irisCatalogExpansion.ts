import type { IrisCatalogCapability } from "./irisCatalog.js";

export const IRIS_CATALOG_EXPANSION: IrisCatalogCapability[] = [
  { id: "scenarios", name: "Scenarios", description: "Explore evidence-bounded what-if changes without changing source data or pretending a scenario occurred.", family: "scenarios", depth: "frontier", atlas_ids: [] },
  { id: "counterfactuals", name: "Counterfactuals", description: "Compare modeled alternatives against the observed baseline and expose assumptions and limits.", family: "scenarios", depth: "frontier", atlas_ids: [] },
  { id: "opportunity-engine", name: "Opportunity Engine", description: "Search across observed relationships for evidence-supported opportunities worth examining.", family: "optimization", depth: "frontier", atlas_ids: ["spending.spending-opportunity-map", "debt.debt-opportunity-map"] },
  { id: "habit-loops", name: "Habit Loops", description: "Examine repeated financial behaviors as connected patterns rather than isolated transactions.", family: "behavior", depth: "frontier", atlas_ids: ["behavior.behavior-analysis", "behavior.merchant-behavior"] },
  { id: "account-relationships", name: "Account Relationships", description: "Understand how activity across connected accounts relates to flows, pressure, and outcomes.", family: "relationships", depth: "frontier", atlas_ids: ["synthesis.relational-reasoning"] },
  { id: "data-health", name: "Data Health", description: "Inspect completeness, lineage, reconciliation, and analytical readiness before trusting a conclusion.", family: "evidence", depth: "frontier", atlas_ids: ["evidence.provider-lineage", "evidence.analytical-readiness"] },
  { id: "decision-lab", name: "Decision Lab", description: "Test choices before acting by comparing evidence-bounded scenarios, consequences, tradeoffs, and constraints.", family: "decisions", depth: "frontier", atlas_ids: ["decisions.decision-analysis", "decisions.decision-graph", "decisions.consequence-analysis", "decisions.optimization-analysis", "synthesis.maximum-intelligence-synthesis"] },
];
