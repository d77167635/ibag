import assert from "node:assert/strict";
import test from "node:test";
import { chooseIrisCombinations, COMBINATION_LIBRARY } from "./trialProductIntelligence.js";

const PRODUCTS = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"] as const;
const mapFor = (items: readonly string[]) => new Map([["item-a", new Set(items)]]);

test("overview rejects split required evidence and accepts same-item evidence", () => {
  assert.equal(chooseIrisCombinations(new Map([["a", new Set(["transactions"])], ["b", new Set(["balance"])]]), "overview").evidence_ready, false);
  assert.equal(chooseIrisCombinations(mapFor(["transactions", "balance"]), "overview").evidence_ready, true);
});

test("liquidity uses conjunctive same-item evidence", () => {
  assert.equal(chooseIrisCombinations(mapFor(["transactions"]), "liquidity").evidence_ready, false);
  assert.equal(chooseIrisCombinations(mapFor(["balance"]), "liquidity").evidence_ready, false);
  assert.equal(chooseIrisCombinations(mapFor(["transactions", "balance"]), "liquidity").evidence_ready, true);
});

test("optional evidence cannot replace required evidence", () => {
  const result = chooseIrisCombinations(mapFor(["balance", "statements", "liabilities", "assets", "investments"]), "overview");
  assert.equal(result.evidence_ready, false);
});

test("all eight products are represented exactly once", () => {
  assert.equal(PRODUCTS.length, 8);
  assert.equal(new Set(PRODUCTS).size, 8);
});

test("all declared combinations are same-item only", () => {
  for (const combo of COMBINATION_LIBRARY) {
    const split = new Map<string, Set<string>>();
    combo.products.forEach((product, index) => split.set(`item-${index}`, new Set([product])));
    const result = chooseIrisCombinations(split, "unknown");
    assert.equal(result.ready_combinations.some((candidate) => candidate.key === combo.key), false);
  }
});
