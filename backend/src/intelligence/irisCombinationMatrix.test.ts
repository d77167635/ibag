import assert from "node:assert/strict";
import test from "node:test";
import { chooseIrisCombinations, COMBINATION_LIBRARY, type IrisProductIntent } from "./trialProductIntelligence.js";

const PRODUCTS = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"] as const;
type Product = typeof PRODUCTS[number];
type Intent = Exclude<IrisProductIntent, "explanation" | "provider_data" | "unknown">;
const INTENTS: Intent[] = ["overview", "cash_flow", "spending", "liquidity", "debt", "roundups", "anomaly"];
const REQUIRED: Record<Intent, Product[][]> = {
  overview: [["transactions"], ["balance"]],
  cash_flow: [["transactions"]],
  spending: [["transactions"]],
  liquidity: [["transactions"], ["balance"]],
  debt: [["liabilities"]],
  roundups: [["transactions"]],
  anomaly: [["transactions"]],
};

const subsets = <T,>(items: readonly T[]) => Array.from({ length: 1 << items.length }, (_, mask) => items.filter((_, i) => Boolean(mask & (1 << i))));
const mapFor = (items: Product[]): Map<string, Set<string>> => new Map([["item-a", new Set(items)]]);
const expectedSingleItem = (observed: readonly Product[], groups: Product[][]) => groups.every((group) => group.some((p) => observed.includes(p)));

for (const intent of INTENTS) {
  test(`${intent}: production selector passes every valid/invalid subset`, () => {
    const matrix = subsets(PRODUCTS);
    assert.equal(matrix.length, 256);
    for (const observed of matrix) {
      const result = chooseIrisCombinations(mapFor(observed), intent);
      assert.equal(result.evidence_ready, expectedSingleItem(observed, REQUIRED[intent]), `unexpected gate for ${intent} with ${observed.join(",") || "none"}`);
      assert.deepEqual(result.required_item_ids, result.evidence_ready ? ["item-a"] : []);
    }
  });
}

test("cross-Item evidence never satisfies a conjunctive intent", () => {
  const split = new Map<string, Set<string>>([
    ["item-a", new Set(["transactions"])],
    ["item-b", new Set(["balance"])],
  ]);
  for (const intent of ["overview", "liquidity"] as const) {
    const result = chooseIrisCombinations(split, intent);
    assert.equal(result.evidence_ready, false);
    assert.deepEqual(result.required_item_ids, []);
  }
});

test("same Item satisfies overview and liquidity when all required products coexist", () => {
  const observed = mapFor(["transactions", "balance"]);
  assert.equal(chooseIrisCombinations(observed, "overview").evidence_ready, true);
  assert.equal(chooseIrisCombinations(observed, "liquidity").evidence_ready, true);
});

test("optional products enrich an intent but never substitute for required products", () => {
  const result = chooseIrisCombinations(mapFor(["balance", "statements", "liabilities", "assets", "investments"]), "overview");
  assert.equal(result.evidence_ready, false);
  assert.equal(result.ready_combinations.some((c) => c.key === "statement_reconciliation"), false);
});

test("every declared combination requires all of its products on one Item", () => {
  for (const combo of COMBINATION_LIBRARY) {
    const complete = mapFor([...combo.products] as Product[]);
    const ready = chooseIrisCombinations(complete, "unknown").ready_combinations.find((c) => c.key === combo.key);
    assert.ok(ready, `combination ${combo.key} should be ready when complete`);

    const split = new Map<string, Set<string>>();
    combo.products.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
    const blocked = chooseIrisCombinations(split, "unknown").ready_combinations.find((c) => c.key === combo.key);
    assert.equal(blocked, undefined, `combination ${combo.key} must not combine across Items`);
  }
});

test("full financial state is only ready with all eight products on the same Item", () => {
  const allEight = chooseIrisCombinations(mapFor([...PRODUCTS]), "unknown");
  assert.deepEqual(allEight.ready_combinations.map((c) => c.key), COMBINATION_LIBRARY.map((c) => c.key));

  const seven = chooseIrisCombinations(mapFor(PRODUCTS.slice(0, 7)), "unknown");
  assert.equal(seven.ready_combinations.some((c) => c.key === "full_financial_state"), false);

  const split = new Map<string, Set<string>>();
  PRODUCTS.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
  const crossItem = chooseIrisCombinations(split, "unknown");
  assert.equal(crossItem.ready_combinations.some((c) => c.key === "full_financial_state"), false);
});

test("non-observed lifecycle/evidence states are not certification states", () => {
  for (const state of ["available", "authorized", "stale", "calculated", "insufficient_evidence"]) assert.notEqual(state, "observed");
});

test("the eight Trial domains are unique and complete", () => {
  assert.equal(PRODUCTS.length, 8);
  assert.equal(new Set(PRODUCTS).size, 8);
});
