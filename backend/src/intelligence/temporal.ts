import { getCanonicalTransactions, computeCanonicalWindowFlows } from "./transactionSemantics.js";
import type { WindowDays } from "./types.js";
import { STANDARD_WINDOWS_DAYS } from "./types.js";

export interface WindowedFlow {
  windowDays: WindowDays;
  inflow: number;
  outflow: number;
  net: number;
  purchaseTotal: number;
  debtPaymentTotal: number;
  txCount: number;
  economicTxCount: number;
}

/** LAYER 3 — all temporal windows use the same canonical economic semantics. */
export async function computeMultiWindowFlow(
  userId: string,
  windows: readonly WindowDays[] = STANDARD_WINDOWS_DAYS
): Promise<WindowedFlow[]> {
  const widest = Math.max(...windows);
  const cutoff = new Date(Date.now() - widest * 86_400_000).toISOString().slice(0, 10);
  const txs = await getCanonicalTransactions(userId, cutoff);
  return computeCanonicalWindowFlows(txs, windows) as WindowedFlow[];
}

export function assessTrajectory(flows: WindowedFlow[]): {
  direction: "accelerating" | "decelerating" | "stable" | "insufficient_evidence";
  shortWindowDailyRate: number | null;
  longWindowDailyRate: number | null;
} {
  const withData = flows.filter((f) => f.economicTxCount > 0).sort((a, b) => a.windowDays - b.windowDays);
  if (withData.length < 2) return { direction: "insufficient_evidence", shortWindowDailyRate: null, longWindowDailyRate: null };
  const short = withData[0];
  const long = withData[withData.length - 1];
  const shortRate = short.outflow / short.windowDays;
  const longRate = long.outflow / long.windowDays;
  if (longRate === 0) return { direction: "insufficient_evidence", shortWindowDailyRate: shortRate, longWindowDailyRate: longRate };
  const deviation = (shortRate - longRate) / longRate;
  return {
    direction: deviation > 0.15 ? "accelerating" : deviation < -0.15 ? "decelerating" : "stable",
    shortWindowDailyRate: shortRate,
    longWindowDailyRate: longRate,
  };
}
