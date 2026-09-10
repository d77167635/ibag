import test from "node:test";
import assert from "node:assert/strict";
import {
  IRIS_DOMAIN_INTELLIGENCES,
  createIrisIntelligenceChild,
  getIrisDomain,
  materializeIrisBranchPath,
  buildIrisHierarchyPath,
  validateIrisIntelligenceHierarchy,
  type IrisIntelligenceNode,
} from "./irisIntelligenceHierarchy.js";

test("Iris has exactly eight formal Level-2 domain intelligences", () => {
  assert.equal(IRIS_DOMAIN_INTELLIGENCES.length, 8);
  assert.deepEqual(IRIS_DOMAIN_INTELLIGENCES.map(item => item.domain_id), [
    "auth",
    "transactions",
    "balance",
    "identity",
    "assets",
    "liabilities",
    "investments",
    "statements",
  ]);
  assert.deepEqual(validateIrisIntelligenceHierarchy(), []);
});

test("every formal Level-2 domain is recursive", () => {
  for (const domain of IRIS_DOMAIN_INTELLIGENCES) {
    assert.equal(domain.level, 2);
    assert.equal(domain.parent_id, "iris");
    assert.equal(domain.can_recurse, true);
  }
});

test("hierarchy can recurse beyond any predetermined semantic level", () => {
  const transactions = getIrisDomain("transactions");
  assert.ok(transactions);

  const path = materializeIrisBranchPath({
    domainId: "transactions",
    branches: Array.from({ length: 40 }, (_, index) => ({
      id: `branch-${index + 1}`,
      name: `Branch ${index + 1}`,
      purpose: `Evaluate the next evidence-governed intelligence question at depth ${index + 1}.`,
      kind: index > 20 ? "higher_order" : "intelligence",
    })),
  });

  assert.equal(path.length, 40);
  assert.equal(path.at(-1)?.level, 42);
  assert.equal(path.at(-1)?.can_recurse, true);
});

test("a higher-order intelligence can itself create another higher-order intelligence", () => {
  const transactions = getIrisDomain("transactions");
  assert.ok(transactions);

  const first = createIrisIntelligenceChild({
    parent: transactions,
    id: "transactions.patterns",
    name: "Transaction Pattern Intelligence",
    purpose: "Examine structured repeated transaction behavior.",
    kind: "intelligence",
  });
  const second = createIrisIntelligenceChild({
    parent: first,
    id: "transactions.patterns.behavior",
    name: "Transaction Pattern Behavior Intelligence",
    purpose: "Examine deeper behavioral structure produced by the preceding intelligence.",
    kind: "higher_order",
  });
  const third = createIrisIntelligenceChild({
    parent: second,
    id: "transactions.patterns.behavior.trajectory",
    name: "Transaction Pattern Behavioral Trajectory Intelligence",
    purpose: "Examine temporal trajectory of the higher-order behavioral pattern.",
    kind: "higher_order",
  });

  assert.equal(first.level, 3);
  assert.equal(second.level, 4);
  assert.equal(third.level, 5);
  assert.equal(third.parent_id, second.id);
  assert.equal(third.can_recurse, true);
});

test("materialized hierarchy paths retain exact ancestry", () => {
  const path = materializeIrisBranchPath({
    domainId: "liabilities",
    branches: [
      { id: "debt", name: "Debt Intelligence", purpose: "Understand observed liability structure." },
      { id: "payment", name: "Debt Payment Intelligence", purpose: "Understand observed payment behavior." },
      { id: "trajectory", name: "Debt Payment Trajectory Intelligence", purpose: "Understand change in observed payment behavior." },
    ],
  });

  const ancestry = buildIrisHierarchyPath(path);
  assert.deepEqual(ancestry.map(item => item.id), [
    "iris",
    "domain.liabilities",
    "debt",
    "payment",
    "trajectory",
  ]);
});

test("hierarchy creation rejects empty semantic definitions", () => {
  const parent: IrisIntelligenceNode = IRIS_DOMAIN_INTELLIGENCES[0];
  assert.throws(() => createIrisIntelligenceChild({ parent, id: "", name: "x", purpose: "x" }));
  assert.throws(() => createIrisIntelligenceChild({ parent, id: "x", name: "", purpose: "x" }));
  assert.throws(() => createIrisIntelligenceChild({ parent, id: "x", name: "x", purpose: "" }));
});
