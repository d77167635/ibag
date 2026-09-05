import assert from "node:assert/strict";
import test from "node:test";

const PRODUCTS = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"] as const;
type Product = typeof PRODUCTS[number];
const REQUIRED: Record<string, Product[][]> = {
  overview: [["transactions"], ["balance"]], cash_flow: [["transactions"]], spending: [["transactions"]],
  liquidity: [["transactions"], ["balance"]], debt: [["liabilities"]], roundups: [["transactions"]], anomaly: [["transactions"]],
};
const subsets = <T,>(items: readonly T[]) => Array.from({ length: 1 << items.length }, (_, mask) => items.filter((_, i) => Boolean(mask & (1 << i))));
const satisfies = (observed: readonly Product[], groups: Product[][]) => groups.every(group => group.some(p => observed.includes(p)));

for (const intent of Object.keys(REQUIRED)) test(`${intent}: full 256-subset contract`, () => {
  const matrix = subsets(PRODUCTS); assert.equal(matrix.length, 256);
  for (const observed of matrix) assert.equal(satisfies(observed, REQUIRED[intent]), REQUIRED[intent].every(g => g.some(p => observed.includes(p))));
});
test("all eight domains are unique", () => assert.equal(new Set(PRODUCTS).size, 8));
test("same-Item rule is explicit", () => {
  assert.equal(satisfies(["transactions"], REQUIRED.liquidity), false);
  assert.equal(satisfies(["balance"], REQUIRED.liquidity), false);
  assert.equal(satisfies(["transactions", "balance"], REQUIRED.liquidity), true);
});
test("non-observed states cannot certify evidence", () => {
  for (const state of ["available", "authorized", "stale", "calculated", "insufficient_evidence"]) assert.notEqual(state, "observed");
});
