import { getCanonicalTransactions, computeCanonicalSpendingHierarchy, computeEconomicCashFlow, computeCanonicalForwardProjection, isEconomicOutflow } from "./transactionSemantics.js";
import type { CapabilityExecutionContext, CapabilityOperatorResult, GovernedCapabilityResult } from "./capabilityOperators.js";

const VERSION = "1.0.0";

type Tx = Awaited<ReturnType<typeof getCanonicalTransactions>>[number];

type Evidence = {
  state: CapabilityOperatorResult["evidence_state"];
  source: "canonical_financial_transactions";
  transaction_count: number;
  limitation?: string;
};

function evidence(txs: Tx[]): Evidence {
  return txs.length
    ? { state: "CALCULATED", source: "canonical_financial_transactions", transaction_count: txs.length }
    : { state: "INSUFFICIENT_EVIDENCE", source: "canonical_financial_transactions", transaction_count: 0, limitation: "No certified canonical financial transactions are available within the evidence boundary." };
}

function base(capability_id: string, result: GovernedCapabilityResult, ev: Evidence): CapabilityOperatorResult {
  return {
    capability_id,
    operator_id: capability_id,
    operator_version: VERSION,
    evidence_state: ev.state,
    result: {
      ...result,
      evidence: ev,
      provenance: {
        source: "canonical_financial_transactions",
        provider_observations_created: false,
        financial_values_created: false,
        money_movement_executed: false,
      },
    },
  };
}

async function transactions(userId: string, asOf?: string | null) {
  const anchor = asOf ? new Date(asOf) : new Date();
  const since = new Date(anchor.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
  return getCanonicalTransactions(userId, since);
}

export async function executeAnalysis(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context?.asOf);
  const ev = evidence(txs);
  const flow = computeEconomicCashFlow(txs);
  const hierarchy = computeCanonicalSpendingHierarchy(txs, 30, context?.asOf);
  return base("analysis", {
    flow,
    spending: hierarchy,
    transaction_count: txs.length,
    evidence_boundary: context?.evidenceBoundary ?? context?.asOf ?? null,
  }, ev);
}

export async function executeBehavioral(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context?.asOf);
  const ev = evidence(txs);
  const purchases = txs.filter((tx) => isEconomicOutflow(tx));
  const merchantMap = new Map<string, { label: string; count: number; amount: number; dates: string[] }>();
  const categoryMap = new Map<string, { label: string; count: number; amount: number }>();
  for (const tx of purchases) {
    const merchant = tx.merchant_id ?? tx.merchant_name ?? "unknown_merchant";
    const merchantLabel = tx.merchant_name ?? "Unknown merchant";
    const m = merchantMap.get(merchant) ?? { label: merchantLabel, count: 0, amount: 0, dates: [] };
    m.count += 1; m.amount += tx.amount; m.dates.push(tx.posted_date); merchantMap.set(merchant, m);
    const category = tx.subdomain?.key ?? "uncategorized";
    const categoryLabel = tx.subdomain?.label ?? "Uncategorized";
    const c = categoryMap.get(category) ?? { label: categoryLabel, count: 0, amount: 0 };
    c.count += 1; c.amount += tx.amount; categoryMap.set(category, c);
  }
  const total = purchases.reduce((s, tx) => s + tx.amount, 0);
  const merchants = [...merchantMap.entries()].map(([key, v]) => ({ key, ...v, share_of_outflow_pct: total > 0 ? (v.amount / total) * 100 : null })).sort((a,b) => b.amount-a.amount).slice(0, 50);
  const categories = [...categoryMap.entries()].map(([key,v]) => ({ key, ...v, share_of_outflow_pct: total > 0 ? (v.amount / total) * 100 : null })).sort((a,b) => b.amount-a.amount);
  return base("behavioral", {
    merchant_frequency: merchants,
    category_frequency: categories,
    concentration: merchants.length ? merchants[0].share_of_outflow_pct : null,
    observation_window_days: 365,
  }, ev);
}

export async function executePattern(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context?.asOf);
  const ev = evidence(txs);
  const byMerchant = new Map<string, Tx[]>();
  for (const tx of txs.filter((x) => isEconomicOutflow(x))) {
    const key = tx.merchant_id ?? tx.merchant_name ?? `tx:${tx.id}`;
    const rows = byMerchant.get(key) ?? []; rows.push(tx); byMerchant.set(key, rows);
  }
  const patterns = [...byMerchant.entries()].map(([merchant, rows]) => {
    const amounts = rows.map((r) => r.amount);
    const mean = amounts.reduce((a,b) => a+b,0) / amounts.length;
    const variance = amounts.reduce((s,a) => s + (a-mean)**2,0) / amounts.length;
    const dates = rows.map((r) => new Date(r.posted_date).getTime()).sort((a,b)=>a-b);
    const gaps = dates.slice(1).map((d,i)=>(d-dates[i])/86_400_000);
    const avgGap = gaps.length ? gaps.reduce((a,b)=>a+b,0)/gaps.length : null;
    const regularity = avgGap === null ? null : 1 / (1 + gaps.reduce((s,g)=>s + Math.abs(g-avgGap),0) / Math.max(1,gaps.length));
    return { merchant_id: merchant, merchant_name: rows[0].merchant_name ?? null, occurrences: rows.length, mean_amount: mean, amount_variability: Math.sqrt(variance), average_gap_days: avgGap, regularity_score: regularity };
  }).filter((x)=>x.occurrences>=2).sort((a,b)=>b.occurrences-a.occurrences).slice(0,100);
  return base("pattern", { recurring_candidates: patterns, pattern_count: patterns.length }, ev);
}

export async function executeRelationship(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context?.asOf);
  const ev = evidence(txs);
  const domains = new Map<string, { label: string; values: Map<string, number> }>();
  for (const tx of txs.filter((x)=>isEconomicOutflow(x))) {
    const key = tx.domain?.key ?? "uncategorized";
    const label = tx.domain?.label ?? "Uncategorized";
    const entry = domains.get(key) ?? { label, values: new Map<string, number>() };
    const month = tx.posted_date.slice(0,7);
    entry.values.set(month, (entry.values.get(month) ?? 0) + tx.amount);
    domains.set(key, entry);
  }
  const series = [...domains.entries()].map(([key,v])=>({key,label:v.label,monthly:[...v.values.entries()].sort().map(([month,amount])=>({month,amount}))}));
  const relationships: Array<Record<string, unknown>> = [];
  for(let i=0;i<series.length;i++) for(let j=i+1;j<series.length;j++) {
    const a = new Map(series[i].monthly.map(x=>[x.month,x.amount]));
    const b = new Map(series[j].monthly.map(x=>[x.month,x.amount]));
    const common=[...a.keys()].filter(k=>b.has(k));
    if(common.length<3) continue;
    const av=common.map(k=>a.get(k)!); const bv=common.map(k=>b.get(k)!);
    const am=av.reduce((s,x)=>s+x,0)/av.length; const bm=bv.reduce((s,x)=>s+x,0)/bv.length;
    const num=av.reduce((s,x,i)=>s+(x-am)*(bv[i]-bm),0);
    const den=Math.sqrt(av.reduce((s,x)=>s+(x-am)**2,0)*bv.reduce((s,x)=>s+(x-bm)**2,0));
    const corr=den>0?num/den:null;
    relationships.push({left:series[i].key,right:series[j].key,common_months:common.length,monthly_correlation:corr,interpretation:corr===null?"insufficient_variation":Math.abs(corr)>=0.7?"strong_association":Math.abs(corr)>=0.4?"moderate_association":"weak_association",causal_claim:false});
  }
  return base("relationship", { domain_series: series, relationships }, ev);
}

export async function executeAnomaly(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context?.asOf);
  const ev = evidence(txs);
  const groups = new Map<string, number[]>();
  for(const tx of txs.filter((x)=>isEconomicOutflow(x))) { const key=tx.subdomain?.key??"uncategorized"; const a=groups.get(key)??[]; a.push(tx.amount); groups.set(key,a); }
  const detections: Array<Record<string, unknown>>=[];
  for(const tx of txs.filter((x)=>isEconomicOutflow(x))) {
    const values=groups.get(tx.subdomain?.key??"uncategorized")??[]; if(values.length<5) continue;
    const sorted=[...values].sort((a,b)=>a-b); const mid=Math.floor(sorted.length/2); const median=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
    const deviations=sorted.map(v=>Math.abs(v-median)).sort((a,b)=>a-b); const dmid=Math.floor(deviations.length/2); const mad=deviations.length%2?deviations[dmid]:(deviations[dmid-1]+deviations[dmid])/2;
    const robustZ=mad>0?0.67448975*(tx.amount-median)/mad:null;
    if(robustZ!==null && Math.abs(robustZ)>=3.5) detections.push({transaction_id:tx.id,merchant_name:tx.merchant_name,amount:tx.amount,category:tx.subdomain?.label??"Uncategorized",median,mad,robust_z:robustZ,method:"median_mad",evidence_state:"CALCULATED"});
  }
  return base("anomaly", { detections, detection_count:detections.length, method:"category-conditioned robust median/MAD", minimum_group_size:5 }, ev);
}

export async function executePredictive(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context?.asOf);
  const ev = evidence(txs);
  if(!txs.length) return base("predictive", { horizon_days:30, projection:null, limitation:"A forward projection requires certified canonical transaction evidence plus certified balance/recurring evidence." }, ev);
  const projection=await computeCanonicalForwardProjection(userId,30,context?.asOf);
  const temporalRates=computeEconomicCashFlow(txs);
  const dailyNet=temporalRates.net/365;
  return base("predictive", { horizon_days:30, projection, historical_daily_net_rate:dailyNet, forecast_type:"constrained_forward_projection", forecast_limitations:["Projection does not infer unobserved income or discretionary spending.","Known recurring essential series are modeled only when their evidence meets the canonical criteria."] }, ev);
}

export async function executeCausal(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs=await transactions(userId,context?.asOf); const ev=evidence(txs);
  const note="This operator identifies temporal/relational candidate explanations only; it does not assert causation from observational transaction data.";
  if(txs.length<30) return base("causal",{candidate_explanations:[],method:"observational_candidate_analysis",causal_claims:false,limitation:"At least 30 canonical transactions are required for candidate analysis."},ev);
  const flow=computeEconomicCashFlow(txs);
  const category=computeCanonicalSpendingHierarchy(txs,30,context?.asOf);
  const candidates=category.slice(0,10).map(x=>({domain:x.label,current_amount:x.amount,change_pct:x.changePct,role:x.amount>flow.outflow*0.2?"material_outflow_component":"outflow_component",causal_claim:false}));
  return base("causal",{candidate_explanations:candidates,method:"observational_candidate_analysis",causal_claims:false,explanation:note},ev);
}

export async function executeScenario(userId:string,context?:CapabilityExecutionContext):Promise<CapabilityOperatorResult>{
  const txs=await transactions(userId,context?.asOf); const ev=evidence(txs); const flow=computeEconomicCashFlow(txs);
  if(!txs.length) return base("scenario",{scenarios:[],limitation:"No certified canonical transactions are available for scenario construction."},ev);
  const baseline=Math.max(0,flow.outflow);
  const levels=[0.05,0.10,0.20,0.30].map(reduction=>({reduction_pct:reduction*100,monthly_outflow_reduction:baseline*reduction/12,annualized_outflow_reduction:baseline*reduction,assumption:"Reduction applied uniformly to observed economic outflow; no behavior change is asserted."}));
  return base("scenario",{baseline_annualized_outflow:baseline,scenarios:levels,scenario_type:"deterministic_spending_reduction",not_observed:true},ev);
}

export async function executeDecision(userId:string,context?:CapabilityExecutionContext):Promise<CapabilityOperatorResult>{
  const txs=await transactions(userId,context?.asOf); const ev=evidence(txs); const flow=computeEconomicCashFlow(txs);
  if(!txs.length)return base("decision",{options:[],limitation:"Decision intelligence requires certified evidence."},ev);
  const hierarchy=computeCanonicalSpendingHierarchy(txs,30,context?.asOf);
  const options=hierarchy.slice(0,5).map((x,i)=>({rank:i+1,domain:x.label,current_amount:x.amount,change_pct:x.changePct,decision_lever:"review",expected_information_gain:"high",reason:x.amount>flow.outflow*0.15?"Material observed outflow component":"Observed outflow component",tradeoff:"Review before acting; Iris does not execute money movement."}));
  return base("decision",{options,decision_basis:"observed economic outflows and recent category change",actionability:options.length?"review_candidates":"insufficient_evidence"},ev);
}

export async function executeRecommendation(userId:string,context?:CapabilityExecutionContext):Promise<CapabilityOperatorResult>{
  const txs=await transactions(userId,context?.asOf); const ev=evidence(txs);
  if(!txs.length)return base("recommendation",{recommendations:[],limitation:"Recommendations are withheld without certified evidence."},ev);
  const hierarchy=computeCanonicalSpendingHierarchy(txs,30,context?.asOf);
  const recommendations=hierarchy.slice(0,5).map(x=>({type:"review",subject:x.label,observed_amount:x.amount,change_pct:x.changePct,why:"This is a material observed spending category; review may reveal a user-controlled opportunity.",certainty:"evidence_based_candidate",money_movement:false}));
  return base("recommendation",{recommendations},ev);
}

export async function executeOutcome(userId:string,context?:CapabilityExecutionContext):Promise<CapabilityOperatorResult>{
  const ev=evidence(await transactions(userId,context?.asOf));
  return base("outcome",{outcomes:[],outcome_state:"INSUFFICIENT_EVIDENCE",limitation:"Outcome intelligence requires a persisted Iris decision/recommendation and a later observed outcome; the system will not infer an outcome from financial activity alone."},ev);
}

export async function executeLearning(userId:string,context?:CapabilityExecutionContext):Promise<CapabilityOperatorResult>{
  const ev=evidence(await transactions(userId,context?.asOf));
  return base("learning",{learned_patterns:[],learning_state:"INSUFFICIENT_EVIDENCE",limitation:"Learning requires validated outcomes across time; no outcome is fabricated from a single intelligence run."},ev);
}

export async function executeEmergent(userId:string,context?:CapabilityExecutionContext):Promise<CapabilityOperatorResult>{
  const txs=await transactions(userId,context?.asOf); const ev=evidence(txs);
  if(!txs.length)return base("emergent",{discoveries:[],limitation:"Higher-order discovery is withheld until lower-order evidence exists."},ev);
  const flow=computeEconomicCashFlow(txs); const hierarchy=computeCanonicalSpendingHierarchy(txs,30,context?.asOf);
  const discoveries=hierarchy.slice(0,5).map(x=>({type:"cross_domain_signal",domain:x.label,amount:x.amount,share_of_observed_outflow_pct:flow.outflow>0?(x.amount/flow.outflow)*100:null,evidence_state:"CALCULATED",causal_claim:false}));
  return base("emergent",{discoveries,composition_depth:3,composition_basis:["economic_flow","spending_hierarchy","cross_domain_synthesis"],limitation:"Higher-order discoveries remain descriptive unless stronger evidence supports inference."},ev);
}
