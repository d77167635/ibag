import { computeBalanceMetrics, computeCashFlowSafety, computeDebtTrend, detectAnomalies } from "../services/intelligence.js";
import { computeEconomicCashFlow, computeRoundupProjectionFromTransactions, getCanonicalTransactions } from "./transactionSemantics.js";
import { computeDebtCostIntelligence } from "./liabilities.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeMultiWindowFlow, assessTrajectory } from "./temporal.js";
import type { Evidence, RiskItem, OpportunityItem } from "./types.js";

export interface FinancialReasoning { risks: RiskItem[]; opportunities: OpportunityItem[]; relationalChain: string[]; unresolvedQuestions: string[]; priorityFocus: { key: string; reason: string } | null; generatedAt: string; }
const severityRank = { high: 3, medium: 2, low: 1 } as const;

export async function computeFinancialReasoning(userId: string, asOf?: string | null): Promise<FinancialReasoning> {
  const widest = 90;
  const anchor = asOf ? new Date(asOf) : new Date();
  const cutoff = new Date(anchor.getTime() - widest * 86_400_000).toISOString().slice(0, 10);
  const canonical = await getCanonicalTransactions(userId, cutoff);
  const currentCutoff = new Date(anchor.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const currentCanonical = canonical.filter(tx => tx.posted_date >= currentCutoff);
  const canonicalCashFlow = computeEconomicCashFlow(currentCanonical);
  const canonicalRoundup = computeRoundupProjectionFromTransactions(canonical);
  const [balances, cashSafety, debtTrend, anomalies, debtCost, drift, multiWindow] = await Promise.all([
    computeBalanceMetrics(userId), computeCashFlowSafety(userId), computeDebtTrend(userId), detectAnomalies(userId), computeDebtCostIntelligence(userId), computeCategoryDrift(userId), computeMultiWindowFlow(userId, undefined, asOf),
  ]);
  const trajectory = assessTrajectory(multiWindow);
  const cashFlow = { ...canonicalCashFlow, windowDays: 30, netChangePct: null as number | null };
  const prior = canonical.filter(tx => tx.posted_date < currentCutoff);
  if (prior.length) { const priorFlow = computeEconomicCashFlow(prior); if (priorFlow.net !== 0) cashFlow.netChangePct = ((canonicalCashFlow.net - priorFlow.net) / Math.abs(priorFlow.net)) * 100; }
  const risks: RiskItem[] = [], opportunities: OpportunityItem[] = [], chain: string[] = [], unresolved: string[] = [];
  if (cashFlow.net !== null && balances.liquidAssets !== null) chain.push(cashFlow.net < 0 ? `Economic cash flow over the last 30 days is negative (${cashFlow.net.toFixed(2)}), alongside liquid assets of ${balances.liquidAssets.toFixed(2)}.` : `Economic cash flow over the last 30 days is positive (${cashFlow.net.toFixed(2)}), alongside liquid assets of ${balances.liquidAssets.toFixed(2)}.`);
  if (debtTrend.changePct !== null && balances.creditUtilization !== null) chain.push(`Revolving debt moved ${debtTrend.changePct >= 0 ? "up" : "down"} ${Math.abs(debtTrend.changePct).toFixed(0)}% over the trend window, alongside average credit utilization of ${(balances.creditUtilization * 100).toFixed(0)}%.`);
  if (debtCost.evidence === "calculated" && debtCost.estimatedMonthlyInterestCost !== null) chain.push(`At the current balance-weighted APR of ${debtCost.weightedAvgApr!.toFixed(1)}%, carrying this revolving balance costs an estimated ${debtCost.estimatedMonthlyInterestCost.toFixed(2)} per month in simple non-compounded interest.`); else unresolved.push(debtCost.basis);
  if (trajectory.direction === "accelerating") chain.push("Economic spending pace is accelerating relative to the longer-window baseline."); else if (trajectory.direction === "insufficient_evidence") unresolved.push("Not enough economic transaction history across multiple time windows to assess spending pace.");
  if (cashFlow.net < 0 && debtTrend.changePct !== null && debtTrend.changePct > 0) unresolved.push("Debt and negative economic cash flow overlap in time, but available evidence does not establish causation.");
  if (cashSafety.safeToSpend !== null && cashSafety.safeToSpend < 0) risks.push({ key:"negative_safe_to_spend", severity:"high", evidence:"calculated", statement:`Safe-to-spend is negative (${cashSafety.safeToSpend.toFixed(2)}) — known essential bills due within ${cashSafety.horizonDays} days exceed current available balance.`, supportingMetrics:{safeToSpend:cashSafety.safeToSpend, essentialBillsTotal:cashSafety.essentialBillsTotal} });
  if (cashSafety.billCollisions.length > 0) risks.push({ key:"bill_collision", severity:"medium", evidence:"observed", statement:`${cashSafety.billCollisions.length} window(s) where 2+ essential bills are due within a few days of each other.`, supportingMetrics:{collisionCount:cashSafety.billCollisions.length} });
  if (debtTrend.changePct !== null && debtTrend.changePct > 20) { const severity = debtTrend.changePct > 100 ? "high" : debtTrend.changePct > 50 ? "medium" : "low"; risks.push({ key:"debt_acceleration", severity, evidence:"calculated", statement:`Revolving debt increased ${debtTrend.changePct.toFixed(0)}% over the trend window${balances.creditUtilization !== null ? `, with average utilization at ${(balances.creditUtilization * 100).toFixed(0)}%` : ""}.`, supportingMetrics:{debtChangePct:debtTrend.changePct,creditUtilization:balances.creditUtilization} }); }
  if (debtCost.evidence === "calculated" && debtCost.minimumPaymentTotal !== null && cashSafety.safeToSpend !== null && debtCost.minimumPaymentTotal > cashSafety.safeToSpend && cashSafety.safeToSpend >= 0) risks.push({ key:"minimum_payment_exceeds_safe_to_spend", severity:"high", evidence:"calculated", statement:`Total minimum payments due (${debtCost.minimumPaymentTotal.toFixed(2)}) exceed safe-to-spend (${cashSafety.safeToSpend.toFixed(2)}).`, supportingMetrics:{minimumPaymentTotal:debtCost.minimumPaymentTotal,safeToSpend:cashSafety.safeToSpend} });
  const significantDrift = drift.filter(d => d.significant && d.deviationPct > 0); if (significantDrift.length) { const top=significantDrift[0]; risks.push({key:"category_spending_drift",severity:significantDrift.length>2?"medium":"low",evidence:"calculated",statement:`${top.subdomainLabel} spending is running ${top.deviationPct.toFixed(0)}% above its established baseline.`,supportingMetrics:{categoriesAffected:significantDrift.length,topCategory:top.subdomainLabel,topDeviationPct:top.deviationPct}}); }
  if (cashFlow.net < 0 && cashFlow.netChangePct !== null && cashFlow.netChangePct < -20) risks.push({key:"cash_flow_deterioration",severity:"medium",evidence:"calculated",statement:`Economic cash flow is negative and worsened ${Math.abs(cashFlow.netChangePct).toFixed(0)}% versus the prior period.`,supportingMetrics:{net:cashFlow.net,netChangePct:cashFlow.netChangePct}});
  if (canonicalRoundup.projected !== null && canonicalRoundup.projected > 0) opportunities.push({key:"roundup_accrual",evidence:"calculated",statement:`At the current eligible purchase pace, Round-Ups are projected to accrue ${canonicalRoundup.projected.toFixed(2)} over the next ${canonicalRoundup.projectDays} days (basis: ${canonicalRoundup.basisDays} days).`,supportingMetrics:{dailyRate:canonicalRoundup.dailyRate,basisDays:canonicalRoundup.basisDays}});
  if (anomalies.length) opportunities.push({key:"review_anomalies",evidence:"observed",statement:`${anomalies.length} transaction${anomalies.length===1?" is":"s are"} meaningfully above that merchant's typical amount.`,supportingMetrics:{anomalyCount:anomalies.length}});
  const decliningDrift = drift.filter(d => d.significant && d.deviationPct < 0); if (decliningDrift.length) opportunities.push({key:"sustained_reduction",evidence:"calculated",statement:`${decliningDrift[0].subdomainLabel} spending is running ${Math.abs(decliningDrift[0].deviationPct).toFixed(0)}% below its established baseline.`,supportingMetrics:{category:decliningDrift[0].subdomainLabel,deviationPct:decliningDrift[0].deviationPct}});
  const priorityFocus = risks.length ? risks.reduce((top,r) => severityRank[r.severity] > severityRank[top.severity] ? r : top) : null;
  return { risks, opportunities, relationalChain:chain, unresolvedQuestions:unresolved, priorityFocus:priorityFocus ? {key:priorityFocus.key,reason:priorityFocus.statement}:null, generatedAt:new Date().toISOString() };
}
