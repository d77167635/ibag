import assert from "node:assert/strict";
import test from "node:test";

const PRODUCTS = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"] as const;
const mapFor = (items: readonly string[]) => new Map([["item-a", new Set(items)]]);
let selector: typeof import("./trialProductIntelligence.js").chooseIrisCombinations;
let combinations: typeof import("./trialProductIntelligence.js").COMBINATION_LIBRARY;

test("load production selector", async () => {
  process.env.PLAID_CLIENT_ID ??= "test-client-id";
  process.env.PLAID_SECRET ??= "test-secret";
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
  process.env.TOKEN_ENCRYPTION_KEY ??= "test-token-encryption-key";
  const mod = await import("./trialProductIntelligence.js");
  selector = mod.chooseIrisCombinations;
  combinations = mod.COMBINATION_LIBRARY;
});

test("overview rejects split required evidence and accepts same-item evidence", () => {
  assert.equal(selector(new Map([["a", new Set(["transactions"])], ["b", new Set(["balance"])]), "overview").evidence_ready, false);
  assert.equal(selector(mapFor(["transactions", "balance"]), "overview").evidence_ready, true);
});

test("liquidity uses conjunctive same-item evidence", () => {
  assert.equal(selector(mapFor(["transactions"]), "liquidity").evidence_ready, false);
  assert.equal(selector(mapFor(["balance"]), "liquidity").evidence_ready, false);
  assert.equal(selector(mapFor(["transactions", "balance"]), "liquidity").evidence_ready, true);
});

test("optional evidence cannot replace required evidence", () => {
  const result = selector(mapFor(["balance", "statements", "liabilities", "assets", "investments"]), "overview");
  assert.equal(result.evidence_ready, false);
});

test("all eight products are represented exactly once", () => {
  assert.equal(PRODUCTS.length, 8);
  assert.equal(new Set(PRODUCTS).size, 8);
});

test("all declared combinations are same-item only", () => {
  for (const combo of combinations) {
    const split = new Map<string, Set<string>>();
    combo.products.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
    const result = selector(split, "unknown");
    assert.equal(result.ready_combinations.some((candidate) => candidate.key === combo.key), false);
  }
});
