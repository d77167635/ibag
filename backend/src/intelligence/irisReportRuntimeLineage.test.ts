import { describe, expect, it } from "vitest";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";

describe("Iris report runtime lineage publication boundary", () => {
  it("does not treat a ready atlas/feature definition as runtime lineage", () => {
    const featureRuntime = buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: {} });
    const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ id: "analysis.test", family: "test", name: "Test", purpose: "Test", output: "Test output", evidence_ready: true, missing_inputs: [] }] }, featureRuntime, ["report.analysis.test"], {});
    expect(runtime.outputs[0]?.runtime_lineage).toBeNull();
    expect(runtime.outputs[0]?.state).toBe("suppressed");
    expect(runtime.outputs[0]?.blockers).toContain("runtime_intelligence_lineage_unresolved");
  });

  it("accepts a report only when exact runtime lineage is resolved", () => {
    const featureRuntime = buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: {} });
    const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ id: "analysis.test", family: "test", name: "Test", purpose: "Test", output: "Test output", evidence_ready: true, missing_inputs: [] }] }, featureRuntime, ["report.analysis.test"], {
      "report.analysis.test": {
        resolution_state: "resolved",
        report_id: "report.analysis.test",
        analysis_definition_id: "analysis.test",
        feature_ids: [],
        capability_ids: ["capability.test"],
        intelligence_node_ids: ["node-real"],
        upstream_intelligence_node_ids: ["node-upstream"],
        run_evidence_ids: ["evidence-real"],
        evidence_lineage_present: true,
        limitation: null,
      },
    });
    expect(runtime.outputs[0]?.runtime_lineage?.intelligence_node_ids).toEqual(["node-real"]);
    expect(runtime.outputs[0]?.runtime_lineage?.run_evidence_ids).toEqual(["evidence-real"]);
  });
});
