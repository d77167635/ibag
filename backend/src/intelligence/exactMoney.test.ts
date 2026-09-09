import test from "node:test";
import assert from "node:assert/strict";
import { averageDailyRate, averageCents, centsToNumber, toCents } from "./exactMoney.js";

test("converts monetary values to integer cents deterministically", () => {
  assert.equal(toCents("12.34"), 1234n);
  assert.equal(toCents(12.34), 1234n);
  assert.equal(toCents("12.345"), 1235n);
  assert.equal(toCents("-0.01"), -1n);
  assert.equal(centsToNumber(1234n), 12.34);
});

test("averages cents without floating-point accumulation", () => {
  assert.equal(averageCents([1n, 2n, 2n]), 1.6666666666666665);
});

test("averages daily rates using exact integer-cent numerators", () => {
  assert.equal(averageDailyRate([{ cents: 10000n, days: 10 }, { cents: 30000n, days: 30 }]), 10);
});
