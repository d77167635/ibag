import { useMemo, useState } from "react";

type Feature = { enabled: boolean; label: string; group?: string };

const DESCRIPTIONS: Record<string, { description: string; depth: string[]; evidence: string[] }> = {
  financial_life_state: { description: "A continuously reconstructed view of your observed financial position and its relationships.", depth: ["Observe state", "Relate domains", "Detect change", "Explain state", "Forecast where evidence supports"], evidence: ["Accounts", "Balances", "Transactions", "Liabilities and investments when observed"] },
  spending_intelligence: { description: "Understand where money goes, what is changing, and what drives the change.", depth: ["Observe", "Classify", "Compare", "Detect patterns", "Explain drivers", "Forecast"], evidence: ["Transactions", "Merchant and category relationships"] },
  cash_flow_intelligence: { description: "Understand the movement, timing, pressure, and trajectory of money entering and leaving your accounts.", depth: ["Inflows", "Outflows", "Timing", "Liquidity", "Pressure", "Forecast"], evidence: ["Transactions", "Balances", "Recurring evidence when observed"] },
  income_intelligence: { description: "Understand observed income sources, timing, recurrence, stability, and changes.", depth: ["Sources", "Timing", "Recurrence", "Stability", "Change", "Forecast"], evidence: ["Transaction evidence", "Income product data when observed"] },
  liquidity_intelligence: { description: "Understand available liquidity and how obligations interact with it over time.", depth: ["Current state", "Coverage", "Pressure", "Timing", "Forward state"], evidence: ["Balance observations", "Known obligations", "Observed cash flow"] },
  debt_intelligence: { description: "Understand debt balances, utilization, cost, trajectory, and potential decision paths.", depth: ["Balances", "Utilization", "Cost", "Change", "Payoff analysis", "Scenarios"], evidence: ["Liability observations when available", "Account and transaction evidence"] },
  net_worth_intelligence: { description: "Understand the composition and movement of observed assets and liabilities.", depth: ["Composition", "Change", "Drivers", "History", "Forecast"], evidence: ["Observed balances", "Investments/liabilities when available"] },
  investment_intelligence: { description: "Analyze observed investment accounts, holdings, transactions, and their relationship to financial position.", depth: ["Holdings", "Allocation", "Transactions", "Performance", "Relationships"], evidence: ["Investments product data"] },
  behavioral_intelligence: { description: "Identify persistent financial behaviors from the user's own observed history.", depth: ["Baseline", "Frequency", "Behavior", "Change", "Persistence"], evidence: ["Historical transactions"] },
  pattern_detection: { description: "Find recurring structures and relationships that are not obvious from isolated transactions.", depth: ["Cluster", "Relate", "Detect", "Validate", "Explain"], evidence: ["Historical observations"] },
  anomaly_detection: { description: "Surface activity that materially differs from an evidence-supported personal baseline.", depth: ["Baseline", "Deviation", "Persistence", "Context", "Evidence"], evidence: ["Transaction history"] },
  recurring_intelligence: { description: "Understand recurring bills, subscriptions, income, and other repeating obligations when evidence supports them.", depth: ["Detect recurrence", "Estimate cadence", "Compare", "Project", "Explain"], evidence: ["Transaction history", "Recurring Transactions product when observed"] },
  forecasting: { description: "Project plausible future states from observed history without presenting inference as fact.", depth: ["Baseline", "Assumptions", "Projection", "Range", "Sensitivity"], evidence: ["Historical observations", "Current balances", "Recurring evidence"] },
  risk_intelligence: { description: "Identify evidence-supported financial pressure, instability, concentration, and other risks.", depth: ["Detect", "Measure", "Contextualize", "Prioritize", "Explain"], evidence: ["Multiple observed financial domains"] },
  opportunity_intelligence: { description: "Identify evidence-supported opportunities to improve a financial outcome without taking action for the user.", depth: ["Detect", "Quantify", "Compare", "Simulate", "Explain"], evidence: ["Observed financial relationships"] },
  scenario_intelligence: { description: "Explore how a change could affect the observed financial state.", depth: ["Baseline", "Assumption", "Impact", "Sensitivity", "Evidence"], evidence: ["Current intelligence model"] },
  decision_intelligence: { description: "Turn evidence into understandable options, consequences, and trade-offs while leaving the decision with the user.", depth: ["Situation", "Options", "Consequences", "Trade-offs", "Evidence"], evidence: ["Relevant observed and calculated intelligence"] },
  financial_education: { description: "Learn the financial concepts behind Iris's analysis, in the context of your own data.", depth: ["Concept", "Your data", "Why it matters", "Examples", "Next question"], evidence: ["Iris explanations", "Your observed financial state"] },
  explainability: { description: "Trace Iris conclusions back through calculations, relationships, provenance, freshness, and source evidence.", depth: ["Conclusion", "Calculation", "Relationship", "Observation", "Provenance"], evidence: ["Evidence and lineage records"] },
  relational_reasoning: { description: "Reason across connected financial objects instead of treating each number as an isolated metric.", depth: ["Entity", "Relationship", "Pattern", "Impact", "Explanation"], evidence: ["Canonical financial relationships"] },
  roundup: { description: "Turn eligible observed purchases into a transparent simulated Round-Up intelligence feature.", depth: ["Eligibility", "Contribution", "Per-card accumulation", "Threshold", "Projection", "Lineage"], evidence: ["Observed transactions", "Round-Up contribution lineage"] },
};

export function IrisFeatureCenter({ features, onToggle, onOpen }: { features: Record<string, Feature> | null; onToggle: (key: string, enabled: boolean) => Promise<void>; onOpen: (key: string) => void }) {
  const [group, setGroup] = useState("All");
  const groups = useMemo(() => ["All", ...Array.from(new Set(Object.keys(features ?? {}).map((key) => DESCRIPTIONS[key]?.description ? (features?.[key]?.group ?? "Iris") : "Iris")))], [features]);
  const entries = Object.entries(features ?? {});
  const visible = group === "All" ? entries : entries.filter(([key]) => (features?.[key]?.group ?? "Iris") === group);
  return <section className="iris-shell-page">
    <div className="iris-page-intro"><div><span className="iris-kicker">IRIS INTELLIGENCE SYSTEM</span><h1>Iris Features</h1><p>Every capability Iris creates from your financial life state is an independent feature. Turn features on or off without changing the underlying evidence.</p></div><div className="iris-feature-count"><strong>{entries.filter(([, f]) => f.enabled).length}</strong><span>active</span><small>of {entries.length} registered</small></div></div>
    <div className="iris-filter-row">{groups.map((item) => <button key={item} className={group === item ? "selected" : ""} onClick={() => setGroup(item)}>{item}</button>)}</div>
    <div className="iris-feature-grid">{visible.map(([key, feature]) => {
      const meta = DESCRIPTIONS[key];
      return <article className={`iris-feature-tile ${feature.enabled ? "enabled" : "disabled"}`} key={key}>
        <div className="iris-feature-tile-top"><span className="iris-feature-symbol">✦</span><span className={`iris-toggle-state ${feature.enabled ? "on" : "off"}`}>{feature.enabled ? "Active" : "Off"}</span></div>
        <h2>{feature.label}</h2><p>{meta?.description ?? "Iris intelligence capability."}</p>
        <div className="iris-feature-depth"><span>Intelligence depth</span><div>{(meta?.depth ?? []).map((step) => <i key={step}>{step}</i>)}</div></div>
        <div className="iris-feature-evidence"><span>Evidence domains</span><p>{(meta?.evidence ?? []).join(" · ")}</p></div>
        <div className="iris-feature-actions"><button onClick={() => onOpen(key)}>Open feature <span>→</span></button><button className="iris-switch" aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.label}`} onClick={() => void onToggle(key, !feature.enabled)}><span className={feature.enabled ? "thumb on" : "thumb"}/></button></div>
      </article>;
    })}</div>
  </section>;
}
