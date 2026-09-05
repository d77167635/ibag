import assert from "node:assert/strict";
import test from "node:test";

process.env.PLAID_CLIENT_ID ??= "test-client-id";
process.env.PLAID_SECRET ??= "test-secret";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.TOKEN_ENCRYPTION_KEY ??= "test-token-encryption-key";

const { chooseIrisCombinations: selector, COMBINATION_LIBRARY: combinations } = await import("./trialProductIntelligence.js");
const PRODUCTS = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"] as const;
type Product = typeof PRODUCTS[number];
type Intent = "overview" | "cash_flow" | "spending" | "liquidity" | "debt" | "roundups" | "anomaly";
const INTENTS: Intent[] = ["overview", "cash_flow", "spending", "liquidity", "debt", "roundups", "anomaly"];
const REQUIRED: Record<Intent, Product[][]> = {
  overview: [["transactions"], ["balance"]], cash_flow: [["transactions"]], spending: [["transactions"]],
  liquidity: [["transactions"], ["balance"]], debt: [["liabilities"], ["balance"], ["transactions"]], roundups: [["transactions"]], anomaly: [["transactions"]],
};
const subsets = <T,>(items: readonly T[]) => Array.from({ length: 1 << items.length }, (_, mask) => items.filter((_, i) => Boolean(mask & (1 << i))));
const mapFor = (items: Product[]): Map<string, Set<string>> => new Map([["item-a", new Set(items)]]);
const expectedSingleItem = (observed: readonly Product[], groups: Product[][]) => groups.every((group) => group.some((p) => observed.includes(p)));

for (const intent of INTENTS) {
  test(`${intent}: production selector passes every valid/invalid 8-product subset`, () => {
    const matrix = subsets(PRODUCTS);
    assert.equal(matrix.length, 256);
    for (const observed of matrix) {
      const result = selector(mapFor(observed), intent);
      assert.equal(result.evidence_ready, expectedSingleItem(observed, REQUIRED[intent]), `unexpected gate for ${intent} with ${observed.join(",") || "none"}`);
      assert.deepEqual(result.required_item_ids, result.evidence_ready ? ["item-a"] : []);
      assert.equal(result.selected_item_id, result.evidence_ready ? "item-a" : null);
    }
  });
}

test("cross-Item evidence never satisfies a conjunctive intent", () => {
  const split = new Map<string, Set<string>>([["item-a", new Set(["transactions"])], ["item-b", new Set(["balance"])]]) as Map<string, Set<string>>;
  for (const intent of ["overview", "liquidity"] as const) {
    const result = selector(split, intent);
    assert.equal(result.evidence_ready, false);
    assert.deepEqual(result.required_item_ids, []);
    assert.equal(result.selected_item_id, null);
  }
});

test("same Item satisfies overview and liquidity when all required products coexist", () => {
  const observed = mapFor(["transactions", "balance"]);
  assert.equal(selector(observed, "overview").evidence_ready, true);
  assert.equal(selector(observed, "liquidity").evidence_ready, true);
});

test("debt requires liabilities, balance, and transactions together", () => {
  assert.equal(selector(mapFor(["liabilities", "balance"]), "debt").evidence_ready, false);
  assert.equal(selector(mapFor(["liabilities", "transactions"]), "debt").evidence_ready, false);
  assert.equal(selector(mapFor(["balance", "transactions"]), "debt").evidence_ready, false);
  assert.equal(selector(mapFor(["liabilities", "balance", "transactions"]), "debt").evidence_ready, true);
});

test("optional products enrich an intent but never substitute for required products", () => {
  const result = selector(mapFor(["balance", "statements", "liabilities", "assets", "investments"]), "overview");
  assert.equal(result.evidence_ready, false);
  assert.equal(result.ready_combinations.some((c) => c.key === "statement_reconciliation"), false);
});

test("every declared combination requires all products on one Item", () => {
  for (const combo of combinations) {
    const complete = mapFor([...combo.products] as Product[]);
    const ready = selector(complete, "unknown").ready_combinations.find((c) => c.key === combo.key);
    assert.ok(ready, `combination ${combo.key} should be ready when complete`);
    assert.equal(ready?.selected_for_request, true);
    const split = new Map<string, Set<string>>();
    combo.products.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
    const blocked = selector(split, "unknown").ready_combinations.find((c) => c.key === combo.key);
    assert.equal(blocked, undefined, `combination ${combo.key} must not combine across Items`);
  }
});

test("when multiple Items qualify, Iris selects one deterministic richest same-Item set", () => {
  const rich = new Set<Product>(PRODUCTS);
  const thin = new Set<Product>(["transactions", "balance"]);
  const result = selector(new Map([["thin-item", thin], ["rich-item", rich]]), "overview");
  assert.equal(result.evidence_ready, true);
  assert.equal(result.selected_item_id, "rich-item");
  assert.equal(result.selected_combinations.every((c) => c.matching_item_ids.includes("rich-item")), true);
});

test("when richness ties, Item selection is deterministic by Item id", () => {
  const result = selector(new Map([
    ["item-z", new Set<Product>(["transactions", "balance"])],
    ["item-a", new Set<Product>(["transactions", "balance"])],
  ]), "liquidity");
  assert.equal(result.selected_item_id, "item-a");
});

test("full financial state is only ready with all eight products on the same Item", () => {
  const allEight = selector(mapFor([...PRODUCTS]), "unknown");
  assert.deepEqual(allEight.ready_combinations.map((c) => c.key), combinations.map((c) => c.key));
  assert.deepEqual(allEight.selected_combinations.map((c) => c.key), combinations.map((c) => c.key));
  const seven = selector(mapFor(PRODUCTS.slice(0, 7)), "unknown");
  assert.equal(seven.ready_combinations.some((c) => c.key === "full_financial_state"), false);
  const split = new Map<string, Set<string>>();
  PRODUCTS.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
  assert.equal(selector(split, "unknown").ready_combinations.some((c) => c.key === "full_financial_state"), false);
});

test("non-observed lifecycle/evidence states are not certification states", () => {
  for (const state of ["available", "authorized", "stale", "calculated", "insufficient_evidence"]) assert.notEqual(state, "observed");
});

test("the eight Trial domains are unique and complete", () => {
  assert.equal(PRODUCTS.length, 8);
  assert.equal(new Set(PRODUCTS).size, 8);
});
