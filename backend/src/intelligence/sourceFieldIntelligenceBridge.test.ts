import assert from "node:assert/strict";
import test from "node:test";
import { resolveSourceFieldIntelligenceBindings } from "./sourceFieldIntelligenceBridge.js";

test("maps one observed source field to multiple intelligence nodes by source-field identity", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [{ id: "obs-1", source_field_id: "field-amount", evidence_state: "observed" }],
    [
      { sourceFieldId: "field-amount", intelligenceNodeId: "tx-economic", fieldKey: "amount", fieldRole: "input", operation: "amount_analysis", operationVersion: "v1", evidenceCompatible: true, active: true },
      { sourceFieldId: "field-amount", intelligenceNodeId: "balance-liquidity", fieldKey: "amount", fieldRole: "input", operation: "liquidity_analysis", operationVersion: "v1", evidenceCompatible: true, active: true }
    ]
  );
  assert.equal(result.length, 2);
  assert.equal(result.every((edge) => edge.edgeRole === "source_field_to_intelligence"), true);
  assert.equal(result.every((edge) => edge.publishable), true);
});

test("does not collide when identical provider paths belong to different registered source fields", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [
      { id: "obs-balance", source_field_id: "field-balance-name", evidence_state: "observed" },
      { id: "obs-identity", source_field_id: "field-identity-name", evidence_state: "observed" }
    ],
    [
      { sourceFieldId: "field-balance-name", intelligenceNodeId: "balance-evidence", fieldKey: "balance_name", fieldRole: "input", operation: "balance_evidence", operationVersion: "v1", evidenceCompatible: true, active: true },
      { sourceFieldId: "field-identity-name", intelligenceNodeId: "identity-evidence", fieldKey: "identity_name", fieldRole: "input", operation: "identity_evidence", operationVersion: "v1", evidenceCompatible: true, active: true }
    ]
  );
  assert.deepEqual(result.map((edge) => [edge.sourceFieldObservationId, edge.intelligenceNodeId]), [
    ["obs-balance", "balance-evidence"],
    ["obs-identity", "identity-evidence"]
  ]);
});

test("never publishes non-observed source evidence", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [{ id: "obs-1", source_field_id: "field-balance", evidence_state: "limited" }],
    [{ sourceFieldId: "field-balance", intelligenceNodeId: "balance", fieldKey: "current_balance", fieldRole: "input", operation: "balance_analysis", operationVersion: "v1", evidenceCompatible: true, active: true }]
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].publishable, false);
  assert.equal(result[0].reason, "source_evidence_limited");
});

test("ignores inactive bindings and unknown source fields", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [
      { id: "obs-1", source_field_id: "field-merchant", evidence_state: "observed" },
      { id: "obs-2", source_field_id: "field-unregistered", evidence_state: "observed" }
    ],
    [{ sourceFieldId: "field-merchant", intelligenceNodeId: "merchant", fieldKey: "merchant_name", fieldRole: "input", operation: "merchant_analysis", operationVersion: "v1", evidenceCompatible: true, active: false }]
  );
  assert.equal(result.length, 0);
});

test("fails closed on an unrecognized evidence state", () => {
  const result = resolveSourceFieldIntelligenceBindings(
    [{ id: "obs-1", source_field_id: "field-category", evidence_state: "fabricated_state" }],
    [{ sourceFieldId: "field-category", intelligenceNodeId: "tx-classification", fieldKey: "category", fieldRole: "input", operation: "classification", operationVersion: "v1", evidenceCompatible: true, active: true }]
  );
  assert.equal(result[0].evidenceState, "unknown");
  assert.equal(result[0].publishable, false);
});
