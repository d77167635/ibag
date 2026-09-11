import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IRIS_REPORT_CATALOG } from "./irisReportCatalog.js";
import { buildIrisReportDependencyGraph, getIrisReportDependency } from "./irisReportDependencyGraph.js";

describe("Iris report dependency graph", () => {
  it("creates one definition-boundary dependency for every catalog report", () => {
    const graph = buildIrisReportDependencyGraph();
    assert.equal(graph.length, IRIS_REPORT_CATALOG.length);
    assert.equal(new Set(graph.map((item) => item.report_id)).size, graph.length);
    for (const report of IRIS_REPORT_CATALOG) {
      const dependency = getIrisReportDependency(report.reportId, graph);
      assert.ok(dependency);
      assert.equal(dependency?.analysis_definition_id, report.analysisId);
      assert.equal(dependency?.resolution_state, "definition_only");
      assert.deepEqual(dependency?.upstream_intelligence_node_ids, []);
    }
  });

  it("never treats evidence keys as persisted intelligence node IDs", () => {
    const graph = buildIrisReportDependencyGraph();
    for (const dependency of graph) {
      assert.ok(dependency.required_evidence_keys.every((value) => typeof value === "string"));
      assert.deepEqual(dependency.upstream_intelligence_node_ids, []);
    }
  });
});
