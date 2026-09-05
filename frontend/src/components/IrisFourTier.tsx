import { type CSSProperties } from "react";

type Item = [string, string, string];

type Props = {
  page: string;
  go?: (page: string) => void;
  intel?: any;
};

const tiers = [
  { id: "iris", n: "01", name: "Command", text: "What Iris knows now and what requires attention." },
  { id: "iris/intelligence", n: "02", name: "Intelligence", text: "The analytical capabilities Iris created from real evidence." },
  { id: "iris/reasoning", n: "03", name: "Reasoning", text: "Relationships, causes, investigations, decisions and consequences." },
  { id: "iris/maximum", n: "04", name: "Maximum Intelligence", text: "Synthesis, simulation, optimization, validation, learning and adaptation." },
];

const intelligence: Item[] = [
  ["iris/findings", "Findings", "Risks, opportunities, changes and evidence gaps"],
  ["iris/timeline", "Timeline", "Financial state across time"],
  ["iris/forecast", "Forecast", "Forward projections and trajectory"],
  ["iris/behavior", "Behavior", "Observed patterns and recurrence"],
  ["iris/liquidity", "Liquidity", "Liquid position and safety"],
  ["iris/roundups", "Round-Ups", "Round-Up opportunity intelligence"],
  ["iris/goals", "Goals", "Goals and financial alignment"],
  ["iris/evidence", "Evidence", "Provider and derived evidence"],
  ["iris/uncertainty", "Uncertainty", "Strength, limits and missing evidence"],
  ["iris/catalog", "Capability Catalog", "Every named Iris capability"],
];

const reasoning: Item[] = [
  ["iris/relationships", "Relationships", "How evidence and intelligence connect"],
  ["iris/causes", "Causes", "Causal hypotheses and drivers"],
  ["iris/decisions", "Decisions", "Options, constraints and readiness"],
  ["iris/scenarios", "Scenarios", "Modeled consequences and alternatives"],
  ["iris/optimization", "Optimization", "Tradeoffs and objectives"],
  ["iris/reasoning-trace", "Reasoning Trace", "How Iris reaches conclusions"],
  ["iris/decision-lab", "Decision Lab", "Test a hypothetical against evidence"],
];

const maximum: Item[] = [
  ["iris/synthesis", "Cross-domain synthesis", "Connect evidence across accounts and analyses"],
  ["iris/causal-intelligence", "Causal intelligence", "Reason over evidence-bounded hypotheses"],
  ["iris/counterfactuals", "Counterfactuals", "Explore changed conditions"],
  ["iris/maximum-optimization", "Optimization", "Balance competing objectives and constraints"],
  ["iris/simulation-decision", "Simulation → decision", "Test consequences before action"],
  ["iris/validation", "Validation", "Compare predictions with actual outcomes"],
  ["iris/learning", "Learning", "Calibrate from validated outcomes"],
  ["iris/adaptation", "Adaptation", "Improve future reasoning from learning"],
];

const details: Record<string, [string, string]> = {
  "iris/findings": ["Detect meaningful risks, opportunities, changes and evidence gaps.", "Certified provider observations and derived analyses."],
  "iris/timeline": ["Explain financial state and behavior across time.", "Canonical transactions, balances and temporal analyses."],
  "iris/forecast": ["Project forward from observed financial behavior.", "Historical cash flow, balances and validated signals."],
  "iris/behavior": ["Identify recurring observed behaviors and deviations.", "Canonical transactions, merchants, categories and windows."],
  "iris/liquidity": ["Understand liquid resources and calculated spending safety.", "Observed balances and classified economic flows."],
  "iris/roundups": ["Measure deterministic Round-Up opportunity.", "Eligible real purchases and immutable calculation rules."],
  "iris/goals": ["Relate stated goals to observed capacity and constraints.", "User-entered goals plus certified evidence."],
  "iris/evidence": ["Expose exactly what Iris can and cannot establish.", "Plaid observations, lineage, sync certification and provenance."],
  "iris/uncertainty": ["Make confidence, limitations and evidence gaps explicit.", "Source fidelity, completeness and provenance."],
  "iris/relationships": ["Connect evidence, entities and analytical outputs.", "Canonical lineage and materialized graph relationships."],
  "iris/causes": ["Investigate plausible drivers without unsupported causal claims.", "Observed states, graph paths and causal analyses."],
  "iris/decisions": ["Evaluate options against evidence and constraints.", "Observed state, analyses, goals and explicit inputs."],
  "iris/scenarios": ["Model alternative conditions and consequences.", "Certified baseline plus explicit hypothetical changes."],
  "iris/optimization": ["Balance competing objectives under constraints.", "Observed state, goals and scenario calculations."],
  "iris/reasoning-trace": ["Show the chain from evidence to conclusion.", "Analysis dependencies, evidence graph and provenance."],
  "iris/decision-lab": ["Test a hypothetical decision against current evidence.", "Certified evidence plus explicitly declared hypothetical inputs."],
  "iris/synthesis": ["Synthesize multiple domains into one financial picture.", "Certified outputs across intelligence and reasoning."],
  "iris/causal-intelligence": ["Combine causal hypotheses across domains.", "Observed evidence plus causal analysis paths."],
  "iris/counterfactuals": ["Explore changed conditions and sensitivity.", "Observed baseline plus declared hypothetical variables."],
  "iris/maximum-optimization": ["Optimize across multiple objectives and constraints.", "Cross-domain state, goals and scenario outputs."],
  "iris/simulation-decision": ["Carry simulation through consequences into decision framing.", "Certified baseline and explicit simulation inputs."],
  "iris/validation": ["Compare predictions and decisions with actual outcomes.", "Later real observations following prior predictions."],
  "iris/learning": ["Calibrate intelligence from validated outcomes.", "Validated predictions and observed outcomes."],
  "iris/adaptation": ["Improve future reasoning from validated learning.", "Calibrated learning signals and current evidence."],
};

const button: CSSProperties = {
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,.035)",
  color: "inherit",
  padding: 15,
  textAlign: "left",
  cursor: "pointer",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
};

function tierOf(page: string) {
  if (page === "iris") return "iris";
  if (page.startsWith("iris/intelligence") || intelligence.some((item) => item[0] === page)) return "iris/intelligence";
  if (page === "iris/reasoning" || reasoning.some((item) => item[0] === page)) return "iris/reasoning";
  return "iris/maximum";
}

function Nav({ page, go }: { page: string; go?: (page: string) => void }) {
  const active = tierOf(page);
  return (
    <nav aria-label="Iris four tier navigation" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0 16px" }}>
      {tiers.map((tier) => (
        <button
          type="button"
          key={tier.id}
          onClick={() => go?.(tier.id)}
          style={{ ...button, minWidth: 145, padding: "10px 13px", background: active === tier.id ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.025)" }}
        >
          <small>TIER {tier.n}</small>
          <br />
          <b>{tier.name}</b>
        </button>
      ))}
    </nav>
  );
}

function Cards({ items, tier, go }: { items: Item[]; tier: string; go?: (page: string) => void }) {
  return (
    <div style={grid}>
      {items.map(([id, name, description]) => (
        <button type="button" key={id} onClick={() => go?.(id)} style={button}>
          <small>{tier}</small>
          <br />
          <strong>{name}</strong>
          <p style={{ margin: "7px 0 8px", opacity: 0.72, fontSize: 12 }}>{description}</p>
          <small>Inspect capability →</small>
        </button>
      ))}
    </div>
  );
}

function Detail({ page, go }: { page: string; go?: (page: string) => void }) {
  const detail = details[page];
  if (!detail) return null;

  const label = page
    .slice(5)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

  return (
    <section className="iis-panel">
      <button type="button" onClick={() => go?.(tierOf(page))} style={{ ...button, padding: "9px 12px", marginBottom: 18 }}>
        ← Back to tier
      </button>
      <span>CAPABILITY INSPECTOR</span>
      <h2>{label}</h2>
      <p className="iis-note">An Iris-created capability. Evidence remains separate from calculation and inference.</p>
      <div style={grid}>
        <article className="iis-card">
          <strong>What it does</strong>
          <p>{detail[0]}</p>
        </article>
        <article className="iis-card">
          <strong>Evidence contract</strong>
          <p>{detail[1]}</p>
        </article>
        <article className="iis-card">
          <strong>Boundary</strong>
          <p>Missing evidence remains missing. Simulation does not mutate provider or account state.</p>
        </article>
      </div>
    </section>
  );
}

export function IrisFourTier({ page, go, intel }: Props) {
  const isDetail = Boolean(details[page]);
  const active = tierOf(page);
  const title =
    active === "iris"
      ? "Iris Command"
      : active === "iris/intelligence"
        ? "Iris Intelligence"
        : active === "iris/reasoning"
          ? "Iris Reasoning"
          : "Iris Maximum Intelligence";

  const metrics = [
    { name: "Liquid position", value: intel?.net_worth?.liquid_assets, state: "OBSERVED" },
    { name: "Safe to spend", value: intel?.cash_flow_safety?.safeToSpend, state: "CALCULATED" },
    { name: "Net cash flow", value: intel?.cash_flow?.net, state: "CALCULATED" },
  ];

  const activeTier = tiers.find((tier) => tier.id === active);

  return (
    <div className="iis-screen" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <Nav page={page} go={go} />

      <header className="iis-hero">
        <span>IRIS · FOUR-TIER INTELLIGENCE SYSTEM</span>
        <h1>{isDetail ? "Iris Capability" : title}</h1>
        <p>{isDetail ? "Inspect purpose, evidence contract and boundary." : activeTier?.text}</p>
      </header>

      {isDetail ? (
        <Detail page={page} go={go} />
      ) : active === "iris" ? (
        <>
          <section className="iis-panel">
            <span>TIER 01 · COMMAND</span>
            <h2>What Iris knows now</h2>
            <p className="iis-note">Current state and evidence status. Deeper intelligence is below.</p>
          </section>
          <div className="iis-metric-grid">
            {metrics.map((metric) => (
              <div className="iis-metric" key={metric.name}>
                <span>{metric.name}</span>
                <strong>
                  {typeof metric.value === "number"
                    ? `$${metric.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </strong>
                <small>{metric.state}</small>
              </div>
            ))}
          </div>
        </>
      ) : active === "iris/intelligence" ? (
        <section className="iis-panel">
          <span>TIER 02 · INTELLIGENCE</span>
          <h2>What Iris created</h2>
          <p className="iis-note">Open any capability to inspect what it does and what evidence it requires.</p>
          <Cards items={intelligence} tier="TIER 02" go={go} />
        </section>
      ) : active === "iris/reasoning" ? (
        <section className="iis-panel">
          <span>TIER 03 · REASONING</span>
          <h2>How Iris reasons</h2>
          <p className="iis-note">Relationships, causes, investigations, decisions and consequences.</p>
          <Cards items={reasoning} tier="TIER 03" go={go} />
        </section>
      ) : (
        <section className="iis-panel">
          <span>TIER 04 · MAXIMUM INTELLIGENCE</span>
          <h2>Open-ended intelligence</h2>
          <p className="iis-note">Synthesis can lead to simulation, decisions, validation, learning and adaptation. This is not a fixed feature count.</p>
          <Cards items={maximum} tier="TIER 04" go={go} />
        </section>
      )}
    </div>
  );
}
