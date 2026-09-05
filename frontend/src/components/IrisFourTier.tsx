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
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 14,
  background: "#171c26",
  color: "#eef2f8",
  padding: 16,
  textAlign: "left",
  cursor: "pointer",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 12,
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
    <nav className="iis-tier-nav" aria-label="Iris four tier navigation">
      {tiers.map((tier) => (
        <button
          type="button"
          key={tier.id}
          onClick={() => go?.(tier.id)}
          style={{ ...button, minWidth: 0, padding: "12px 14px", background: active === tier.id ? "linear-gradient(135deg,#3b315f,#57477e)" : "#171c26", borderColor: active === tier.id ? "#75629f" : "rgba(255,255,255,.11)" }}
        >
          <small style={{ color: "#aeb7c8", fontWeight: 700 }}>TIER {tier.n}</small>
          <br />
          <b style={{ color: "#ffffff", fontSize: 14 }}>{tier.name}</b>
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
          <small style={{ color: "#9ba8bc", fontWeight: 700, letterSpacing: ".08em" }}>{tier}</small>
          <br />
          <strong style={{ display: "block", marginTop: 3, color: "#ffffff", fontSize: 15, lineHeight: 1.3 }}>{name}</strong>
          <p style={{ margin: "8px 0 10px", color: "#b8c1d0", fontSize: 13, lineHeight: 1.5 }}>{description}</p>
          <small style={{ color: "#8e9bb0", fontWeight: 650 }}>Inspect capability →</small>
        </button>
      ))}
    </div>
  );
}

function Detail({ page, go }: { page: string; go?: (page: string) => void }) {
  const detail = details[page];
  if (!detail) return null;

  const label = page.slice(5).replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());

  return (
    <section className="iis-panel" style={{ background: "#111722", color: "#eef2f8", borderColor: "#2a3445" }}>
      <button type="button" onClick={() => go?.(tierOf(page))} style={{ ...button, padding: "9px 12px", marginBottom: 18, background: "#1b2230" }}>
        ← Back to tier
      </button>
      <span style={{ color: "#a98ee5", fontWeight: 800, letterSpacing: ".12em", fontSize: 10 }}>CAPABILITY INSPECTOR</span>
      <h2 style={{ color: "#ffffff", marginTop: 7 }}>{label}</h2>
      <p className="iis-note" style={{ color: "#b8c1d0" }}>An Iris-created capability. Evidence remains separate from calculation and inference.</p>
      <div style={grid}>
        <article className="iis-card" style={{ background: "#171e2a", border: "1px solid #2a3445", borderRadius: 14, padding: 16, color: "#eef2f8" }}>
          <strong style={{ color: "#ffffff" }}>What it does</strong>
          <p style={{ color: "#b8c1d0", lineHeight: 1.55 }}>{detail[0]}</p>
        </article>
        <article className="iis-card" style={{ background: "#171e2a", border: "1px solid #2a3445", borderRadius: 14, padding: 16, color: "#eef2f8" }}>
          <strong style={{ color: "#ffffff" }}>Evidence contract</strong>
          <p style={{ color: "#b8c1d0", lineHeight: 1.55 }}>{detail[1]}</p>
        </article>
        <article className="iis-card" style={{ background: "#171e2a", border: "1px solid #2a3445", borderRadius: 14, padding: 16, color: "#eef2f8" }}>
          <strong style={{ color: "#ffffff" }}>Boundary</strong>
          <p style={{ color: "#b8c1d0", lineHeight: 1.55 }}>Missing evidence remains missing. Simulation does not mutate provider or account state.</p>
        </article>
      </div>
    </section>
  );
}

export function IrisFourTier({ page, go, intel }: Props) {
  const isDetail = Boolean(details[page]);
  const active = tierOf(page);
  const title = active === "iris" ? "Iris Command" : active === "iris/intelligence" ? "Iris Intelligence" : active === "iris/reasoning" ? "Iris Reasoning" : "Iris Maximum Intelligence";

  const metrics = [
    { name: "Liquid position", value: intel?.net_worth?.liquid_assets, state: "OBSERVED" },
    { name: "Safe to spend", value: intel?.cash_flow_safety?.safeToSpend, state: "CALCULATED" },
    { name: "Net cash flow", value: intel?.cash_flow?.net, state: "CALCULATED" },
  ];

  const activeTier = tiers.find((tier) => tier.id === active);

  return (
    <div className="iis-screen" style={{ maxWidth: 1280, width: "100%", margin: "0 auto", minWidth: 0, color: "#eef2f8" }}>
      <style>{`
        .iis-screen, .iis-screen * { min-width:0; box-sizing:border-box; }
        .iis-screen { color:#eef2f8 !important; }
        .iis-screen .iis-tier-nav { display:grid !important; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; padding:4px 0 16px; }
        .iis-screen .iis-tier-nav button { width:100%; min-width:0 !important; overflow:hidden; box-shadow:0 5px 18px rgba(0,0,0,.16); }
        .iis-screen .iis-hero { width:100%; min-width:0; overflow:hidden; padding:28px 26px !important; border:1px solid #2a3445 !important; border-radius:18px !important; background:linear-gradient(135deg,#121927 0%,#20283a 55%,#2a2340 100%) !important; color:#eef2f8 !important; box-shadow:0 14px 36px rgba(0,0,0,.18) !important; }
        .iis-screen .iis-hero > span { color:#a98ee5 !important; font-weight:800; letter-spacing:.13em; font-size:10px; }
        .iis-screen .iis-hero h1 { color:#ffffff !important; margin:9px 0 10px !important; letter-spacing:-.04em; }
        .iis-screen .iis-hero p { color:#bdc7d6 !important; max-width:720px; line-height:1.55; }
        .iis-screen .iis-panel { width:100%; min-width:0; overflow:hidden; margin-top:12px; padding:22px !important; border:1px solid #2a3445 !important; border-radius:16px !important; background:#111722 !important; color:#eef2f8 !important; box-shadow:0 10px 28px rgba(0,0,0,.15) !important; }
        .iis-screen .iis-panel > span { color:#a98ee5 !important; font-size:10px; font-weight:800; letter-spacing:.13em; }
        .iis-screen .iis-panel h2 { color:#ffffff !important; margin:8px 0 7px !important; }
        .iis-screen .iis-note { color:#aeb9ca !important; line-height:1.55 !important; }
        .iis-screen .iis-card { background:#171e2a !important; border:1px solid #2a3445 !important; color:#eef2f8 !important; box-shadow:0 6px 18px rgba(0,0,0,.12); }
        .iis-screen .iis-metric-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:12px; }
        .iis-screen .iis-metric { min-width:0; padding:18px; border:1px solid #2a3445; border-radius:14px; background:#171e2a; box-shadow:0 7px 20px rgba(0,0,0,.14); }
        .iis-screen .iis-metric span { color:#9ba8bc !important; font-size:11px; font-weight:700; letter-spacing:.07em; }
        .iis-screen .iis-metric strong { display:block; margin:9px 0 4px; color:#ffffff !important; font-size:27px; letter-spacing:-.03em; }
        .iis-screen .iis-metric small { color:#8fd0b3 !important; font-size:10px; font-weight:800; letter-spacing:.08em; }
        .iis-screen .iis-panel button:hover,.iis-screen .iis-tier-nav button:hover { filter:brightness(1.12); transform:translateY(-1px); }
        .iis-screen button { transition:filter .15s ease,transform .15s ease,border-color .15s ease; }
        @media (max-width:720px) {
          .iis-screen .iis-tier-nav { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:7px; }
          .iis-screen .iis-hero { padding:20px 16px !important; border-radius:15px !important; }
          .iis-screen .iis-panel { padding:16px !important; border-radius:14px !important; }
          .iis-screen .iis-metric-grid { grid-template-columns:1fr !important; }
          .iis-screen .iis-card { min-width:0; }
        }
        @media (max-width:420px) {
          .iis-screen .iis-tier-nav { gap:6px; }
          .iis-screen .iis-tier-nav button { padding:10px !important; }
          .iis-screen .iis-hero h1 { font-size:30px !important; line-height:1.05; }
          .iis-screen .iis-hero p { font-size:13px !important; }
        }
      `}</style>
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
                <strong>{typeof metric.value === "number" ? `$${metric.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</strong>
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
