import test from "node:test";
import assert from "node:assert/strict";
import { buildAdaptiveBaseline, isRobustOutlier, robustStatistics } from "./statisticalPrimitives.js";

test("robust statistics establish median/MAD references from observed values", () => {
  const stats = robustStatistics([80, 100, 120, 140]);
  assert.equal(stats.sampleSize, 4);
  assert.equal(stats.median, 110);
  assert.equal(stats.mad, 20);
  assert.equal(stats.method, "median_mad");
  assert.equal(stats.lowerReference, 50);
  assert.equal(stats.upperReference, 170);
});

test("adaptive baseline stays limited with one observed value", () => {
  const baseline = buildAdaptiveBaseline([100]);
  assert.equal(baseline.status, "limited");
  assert.equal(baseline.sampleSize, 1);
  assert.equal(baseline.center, 100);
  assert.equal(baseline.lowerReference, null);
  assert.equal(baseline.upperReference, null);
});

test("adaptive baseline detects a robust outlier without treating missing observations as zero", () => {
  const baseline = buildAdaptiveBaseline([100, 105, 95, 102, 101], 300);
  assert.equal(baseline.status, "established");
  assert.ok(baseline.modifiedZ !== null && baseline.modifiedZ > 3.5);
  assert.equal(isRobustOutlier(300, baseline), true);
});
