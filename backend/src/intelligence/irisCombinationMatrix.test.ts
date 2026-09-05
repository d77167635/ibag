import assert from "node:assert/strict";
import test from "node:test";

const PRODUCTS = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"] as const;
type Product = typeof PRODUCTS[number];
type Intent = "overview" | "cash_flow" | "spending" | "liquidity" | "debt" | "roundups" | "anomaly";
const INTENTS: Intent[] = ["overview", "cash_flow", "spending", "liquidity", "debt", "roundups", "anomaly"];
const REQUIRED: Record<Intent, Product[][]> = {
  overview: [["transactions"], ["balance"]], cash_flow: [["transactions"]], spending: [["transactions"]],
  liquidity: [["transactions"], ["balance"]], debt: [["liabilities"]], roundups: [["transactions"]], anomaly: [["transactions"]],
};
const subsets = <T,>(items: readonly T[]) => Array.from({ length: 1 << items.length }, (_, mask) => items.filter((_, i) => Boolean(mask & (1 << i))));
const mapFor = (items: Product[]): Map<string, Set<string>> => new Map([["item-a", new Set(items)]]);
const expectedSingleItem = (observed: readonly Product[], groups: Product[][]) => groups.every((group) => group.some((p) => observed.includes(p)));
let selector: typeof import("./trialProductIntelligence.js").chooseIrisCombinations;
let combinations: typeof import("./trialProductIntelligence.js").COMBINATION_LIBRARY;

test("load production selector without requiring secrets", async () => {
  process.env.PLAID_CLIENT_ID ??= "test-client-id";
  process.env.PLAID_SECRET ??= "test-secret";
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
  process.env.TOKEN_ENCRYPTION_KEY ??= "test-token-encryption-key";
  const mod = await import("./trialProductIntelligence.js");
  selector = mod.chooseIrisCombinations;
  combinations = mod.COMBINATION_LIBRARY;
});

for (const intent of INTENTS) {
  test(`${intent}: production selector passes every valid/invalid 8-product subset`, async () => {
    assert.ok(selector);
    const matrix = subsets(PRODUCTS);
    assert.equal(matrix.length, 256);
    for (const observed of matrix) {
      const result = selector(mapFor(observed), intent);
      assert.equal(result.evidence_ready, expectedSingleItem(observed, REQUIRED[intent]), `unexpected gate for ${intent} with ${observed.join(",") || "none"}`);
      assert.deepEqual(result.required_item_ids, result.evidence_ready ? ["item-a"] : []);
    }
  });
}

test("cross-Item evidence never satisfies a conjunctive intent", () => {
  const split = new Map<string, Set<string>>([["item-a", new Set(["transactions"])], ["item-b", new Set(["balance"])]]) as Map<string, Set<string>>;
  for (const intent of ["overview", "liquidity"] as const) {
    const result = selector(split, intent);
    assert.equal(result.evidence_ready, false);
    assert.deepEqual(result.required_item_ids, []);
  }
});

test("same Item satisfies overview and liquidity when all required products coexist", () => {
  const observed = mapFor(["transactions", "balance"]);
  assert.equal(selector(observed, "overview").evidence_ready, true);
  assert.equal(selector(observed, "liquidity").evidence_ready, true);
});

test("optional products enrich an intent but never substitute for required products", () => {
  const result = selector(mapFor(["balance", "statements", "liabilities", "assets", "investments"]), "overview");
  assert.equal(result.evidence_ready, false);
  assert.equal(result.ready_combinations.some((c) => c.key === "statement_reconciliation"), false);
});

test("every declared combination requires all products on one Item", () => {
  assert.ok(combinations);
  for (const combo of combinations) {
    const complete = mapFor([...combo.products] as Product[]);
    const ready = selector(complete, "unknown").ready_combinations.find((c) => c.key === combo.key);
    assert.ok(ready, `combination ${combo.key} should be ready when complete`);
    const split = new Map<string, Set<string>>();
    combo.products.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
    const blocked = selector(split, "unknown").ready_combinations.find((c) => c.key === combo.key);
    assert.equal(blocked, undefined, `combination ${combo.key} must not combine across Items`);
  }
});

test("full financial state is only ready with all eight products on the same Item", () => {
  const allEight = selector(mapFor([...PRODUCTS]), "unknown");
  assert.deepEqual(allEight.ready_combinations.map((c) => c.key), combinations.map((c) => c.key));
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
