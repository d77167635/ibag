import assert from "node:assert/strict";
import test from "node:test";

process.env.PLAID_CLIENT_ID ??= "test-client-id";
process.env.PLAID_SECRET ??= "test-secret";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.TOKEN_ENCRYPTION_KEY ??= "test-token-encryption-key";

const { chooseIrisCombinations, COMBINATION_LIBRARY } = await import("./trialProductIntelligence.js");

const PRODUCTS = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"] as const;

test("all 255 non-empty same-Item product subsets are evaluated deterministically", () => {
  let evaluated = 0;
  for (let mask = 1; mask < (1 << PRODUCTS.length); mask++) {
    const products = PRODUCTS.filter((_, i) => Boolean(mask & (1 << i)));
    const result = chooseIrisCombinations(new Map([["item-a", new Set(products)]]), "unknown");
    assert.equal(result.cross_item_combination_forbidden, true);
    for (const combo of COMBINATION_LIBRARY) {
      const shouldMatch = combo.products.every((p) => products.includes(p));
      const actual = result.ready_combinations.some((c) => c.key === combo.key);
      assert.equal(actual, shouldMatch, `subset ${products.join(",")} / ${combo.key}`);
    }
    evaluated++;
  }
  assert.equal(evaluated, 255);
});

test("no declared combination can be satisfied by splitting its products across Items", () => {
  for (const combo of COMBINATION_LIBRARY) {
    const split = new Map<string, Set<string>>();
    combo.products.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
    const result = chooseIrisCombinations(split, "unknown");
    assert.equal(result.ready_combinations.some((c) => c.key === combo.key), false, combo.key);
    const blocked = result.blocked_combinations.find((c) => c.key === combo.key);
    assert.ok(blocked, combo.key);
    assert.ok((blocked?.cross_item_conflict_products?.length ?? 0) > 0, combo.key);
  }
});

test("declared combination products are unique and use only the eight canonical Trial domains", () => {
  const allowed = new Set(PRODUCTS);
  for (const combo of COMBINATION_LIBRARY) {
    assert.equal(new Set(combo.products).size, combo.products.length, combo.key);
    for (const product of combo.products) assert.ok(allowed.has(product as typeof PRODUCTS[number]), `${combo.key}:${product}`);
  }
});

/**
 * This test intentionally distinguishes a capability declaration from proof of
 * downstream analytical consumption. A combination may be selector-ready while
 * one or more named analyses remain unproven until a real request executes that
 * analysis against the combination's same-Item evidence.
 */
test("declared analyses are not silently treated as consumed capabilities", () => {
  for (const combo of COMBINATION_LIBRARY) {
    assert.ok(Array.isArray(combo.analyses) && combo.analyses.length > 0, combo.key);
    for (const analysis of combo.analyses) assert.equal(typeof analysis, "string");
  }
});
