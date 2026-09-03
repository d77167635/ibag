import { supabaseAdmin } from "../config/supabase.js";
import { classifyTransaction } from "./classification.js";
import type { WindowDays } from "./types.js";
import { STANDARD_WINDOWS_DAYS } from "./types.js";

/**
 * LAYER 3 — TEMPORAL INTELLIGENCE
 *
 * Prior state: every metric in services/intelligence.ts hardcoded its own
 * single window (30 days for cash flow, 90 for balance history, 30 for
 * debt trend, 14 for safe-to-spend) with no shared concept of "the same
 * question, asked at multiple horizons." That makes it structurally
 * impossible to answer "is this a 7-day blip or a 90-day trend" — the
 * data to answer that exists in `transactions`, but nothing computed it
 * at more than one horizon.
 *
 * This module fetches transactions ONCE (the widest window requested)
 * and slices them in memory per window, rather than issuing one DB query
 * per window — avoiding the N-query pattern while still answering
 * multiple horizons.
 */

export interface WindowedFlow {
  windowDays: WindowDays;
  inflow: number;
  outflow: number;
  net: number;
  purchaseTotal: number;
  debtPaymentTotal: number;
  txCount: number;
}

/**
 * Computes inflow/outflow/net AND classified purchase/debt-payment totals
 * across every window in `windows`, from one query. Returns [] entries
 * with all-zero totals are never fabricated — a window with genuinely no
 * transactions returns explicit zeros only because zero outflow over zero
 * transactions is a true fact, not a stand-in for missing data (unlike
 * computeBalanceMetrics elsewhere, which returns null for missing
 * accounts — the distinction matters: here the account exists and we
 * looked, we just found nothing in that slice of time).
 */
export async function computeMultiWindowFlow(
  userId: string,
  windows: readonly WindowDays[] = STANDARD_WINDOWS_DAYS
): Promise<WindowedFlow[]> {
  const widest = Math.max(...windows);
  const cutoff = new Date(Date.now() - widest * 86_400_000).toISOString().slice(0, 10);

  const { data: txs, error } = await supabaseAdmin
    .from("transactions")
    .select("amount, posted_date, plaid_category_primary, plaid_category_detailed")
    .eq("user_id", userId)
    .eq("pending", false)
    .gte("posted_date", cutoff);

  if (error) throw error;

  return [...windows]
    .sort((a, b) => a - b)
    .map((days) => {
      const windowStart = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const inWindow = (txs ?? []).filter((t) => t.posted_date >= windowStart);

      let inflow = 0;
      let outflow = 0;
      let purchaseTotal = 0;
      let debtPaymentTotal = 0;

      for (const tx of inWindow) {
        const amount = Number(tx.amount);
        if (amount < 0) inflow += Math.abs(amount);
        else outflow += amount;

        const cls = classifyTransaction({
          amount,
          plaid_category_primary: tx.plaid_category_primary,
          plaid_category_detailed: tx.plaid_category_detailed,
        });
        if (cls === "purchase") purchaseTotal += amount;
        if (cls === "debt_payment") debtPaymentTotal += amount;
      }

      return {
        windowDays: days,
        inflow,
        outflow,
        net: inflow - outflow,
        purchaseTotal,
        debtPaymentTotal,
        txCount: inWindow.length,
      };
    });
}

/**
 * Trajectory across windows: is the trend accelerating, decelerating, or
 * flat? Computed as average daily outflow per window — comparing a 7-day
 * daily rate to a 90-day daily rate answers "is this week unusual for
 * this person" in a way a single window cannot. Requires at least 2
 * windows with transactions to say anything; otherwise explicitly
 * insufficient.
 */
export function assessTrajectory(flows: WindowedFlow[]): {
  direction: "accelerating" | "decelerating" | "stable" | "insufficient_evidence";
  shortWindowDailyRate: number | null;
  longWindowDailyRate: number | null;
} {
  const withData = flows.filter((f) => f.txCount > 0).sort((a, b) => a.windowDays - b.windowDays);
  if (withData.length < 2) {
    return { direction: "insufficient_evidence", shortWindowDailyRate: null, longWindowDailyRate: null };
  }

  const short = withData[0];
  const long = withData[withData.length - 1];
  const shortRate = short.outflow / short.windowDays;
  const longRate = long.outflow / long.windowDays;

  if (longRate === 0) {
    return { direction: "insufficient_evidence", shortWindowDailyRate: shortRate, longWindowDailyRate: longRate };
  }

  const deviation = (shortRate - longRate) / longRate;
  const direction = deviation > 0.15 ? "accelerating" : deviation < -0.15 ? "decelerating" : "stable";

  return { direction, shortWindowDailyRate: shortRate, longWindowDailyRate: longRate };
}
