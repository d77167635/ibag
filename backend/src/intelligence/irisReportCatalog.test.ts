import assert from "node:assert/strict";
import test from "node:test";
import { IRIS_ANALYSIS_ATLAS } from "./analysisAtlas.js";
import { IRIS_DEFAULT_ACTIVE_REPORT_IDS, IRIS_REPORT_CATALOG, buildIrisReportTitle } from "./irisReportCatalog.js";

test("report catalog is derived from the analytical atlas", () => {
  assert.equal(IRIS_REPORT_CATALOG.length, IRIS_ANALYSIS_ATLAS.length);
  assert.equal(new Set(IRIS_REPORT_CATALOG.map((report) => report.reportId)).size, IRIS_REPORT_CATALOG.length);
  for (const report of IRIS_REPORT_CATALOG) assert.equal(report.reportId, `report.${report.analysisId}`);
});

test("default active set contains only defined report products", () => {
  const ids = new Set(IRIS_REPORT_CATALOG.map((report) => report.reportId));
  assert.equal(IRIS_DEFAULT_ACTIVE_REPORT_IDS.length, IRIS_REPORT_CATALOG.length);
  assert.ok(IRIS_DEFAULT_ACTIVE_REPORT_IDS.every((id) => ids.has(id)));
});

test("contextual report titles use only supplied runtime information", () => {
  const report = IRIS_REPORT_CATALOG[0]!;
  assert.equal(buildIrisReportTitle(report), report.name);
  assert.equal(buildIrisReportTitle(report, { entityLabel: "Observed account" }), `${report.name} — Observed account`);
});
