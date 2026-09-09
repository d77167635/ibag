import assert from "node:assert/strict";
import test from "node:test";
import { resolveSourceFieldIntelligenceBindings } from "./sourceFieldIntelligenceBridge.js";

test("maps one observed source field to multiple intelligence nodes", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [{ id: "obs-1", field_path: "amount", evidence_state: "observed" }],
    [
      { sourceFieldPath: "amount", intelligenceNodeId: "tx-economic", fieldKey: "amount", fieldRole: "input", operation: "amount_analysis", operationVersion: "v1", evidenceCompatible: true, active: true },
      { sourceFieldPath: "amount", intelligenceNodeId: "balance-liquidity", fieldKey: "amount", fieldRole: "input", operation: "liquidity_analysis", operationVersion: "v1", evidenceCompatible: true, active: true }
    ]
  );
  assert.equal(result.length, 2);
  assert.equal(result.every((edge) => edge.edgeRole === "source_field_to_intelligence"), true);
  assert.equal(result.every((edge) => edge.publishable), true);
});

test("never publishes non-observed source evidence", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [{ id: "obs-1", field_path: "balance.current", evidence_state: "limited" }],
    [{ sourceFieldPath: "balance.current", intelligenceNodeId: "balance", fieldKey: "current_balance", fieldRole: "input", operation: "balance_analysis", operationVersion: "v1", evidenceCompatible: true, active: true }]
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].publishable, false);
  assert.equal(result[0].reason, "source_evidence_limited");
});

test("ignores inactive bindings and unknown source fields", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [
      { id: "obs-1", field_path: "merchant_name", evidence_state: "observed" },
      { id: "obs-2", field_path: "unregistered.field", evidence_state: "observed" }
    ],
    [{ sourceFieldPath: "merchant_name", intelligenceNodeId: "merchant", fieldKey: "merchant_name", fieldRole: "input", operation: "merchant_analysis", operationVersion: "v1", evidenceCompatible: true, active: false }]
  );
  assert.equal(result.length, 0);
});

test("fails closed on an unrecognized evidence state", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [{ id: "obs-1", field_path: "category.primary", evidence_state: "fabricated_state" }],
    [{ sourceFieldPath: "category.primary", intelligenceNodeId: "tx-classification", fieldKey: "category", fieldRole: "input", operation: "classification", operationVersion: "v1", evidenceCompatible: true, active: true }]
  );
  assert.equal(result[0].evidenceState, "unknown");
  assert.equal(result[0].publishable, false);
});
