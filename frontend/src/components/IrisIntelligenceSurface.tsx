import "./IrisIntelligenceSurface.css";

type Props = { go?: (page: string) => void };

const domains = [
  ["01", "Authentication", "Identity and authorization foundations."],
  ["02", "Transactions", "Observed transaction activity and source lineage."],
  ["03", "Balance", "Observed account-position evidence across time."],
  ["04", "Identity", "Provider-observed identity information."],
  ["05", "Assets", "Provider-observed asset information."],
  ["06", "Liabilities", "Provider-observed liability information."],
  ["07", "Investments", "Provider-observed investment information."],
  ["08", "Statements", "Architecturally authoritative; deferred until real banking."],
] as const;

const stages = [
  ["Observed evidence", "What the source actually returned.", "Unavailable or unknown information cannot become a fact."],
  ["Canonical state", "Governed reality assembled from evidence.", "Source identity, freshness, uncertainty and evidence boundaries remain attached."],
  ["Interpretation", "Meaning extracted from canonical state.", "Interpretation remains distinct from provider observation."],
  ["Temporal / statistical", "Change, distributions, baselines and time relationships.", "Calculations remain calculations, not source observations."],
  ["Relational / behavioral", "Connections among entities and behaviors.", "Multiple upstream relationships can converge into intelligence."],
  ["Patterns / anomalies", "Recurring structures and deviations.", "A detected structure cannot invent activity."],
  ["Causal reasoning", "Causal conclusions where evidence and method support them.", "Correlation is never silently promoted to causation."],
  ["Prediction", "Forward-looking analytical conclusions.", "Predictions remain predictions."],
  ["Scenarios / counterfactuals", "Explicitly hypothetical reasoning branches.", "Scenario results remain separate from observed reality."],
  ["Risk / opportunity", "Higher-order interpretation of supported conditions.", "Evidence, limitations and applicability remain part of the result."],
  ["Decisions / consequences", "Reasoning about choices and possible consequences.", "Decision intelligence does not mean an action occurred."],
  ["Outcomes / learning", "Observed consequences becoming governed inputs.", "Learning requires actual outcomes."],
  ["Cross-domain synthesis", "Composition across authoritative domains.", "Composition is constrained by the evidence available to the execution."],
  ["Higher-order intelligence", "New intelligence derived from existing intelligence.", "Derived nodes retain exact upstream references and recursive lineage."],
  ["Recursive composition", "New intelligence becoming upstream intelligence.", "Semantic depth has no artificial maximum; runtime budgets are execution constraints."],
] as const;

const paths = [
  "Observed evidence → canonical state → intelligence node → higher-order node",
  "Higher-order node → upstream intelligence → canonical state → source evidence",
  "One node → multiple parents → cross-domain relationship → new derived node",
  "Derived node → exact upstream references → recursive ancestry → evidence boundary",
];

export function IrisIntelligenceSurface({ go }: Props) {
  return <main className="iris-intelligence-surface">
    <section className="iis-header">
      <div>
        <span className="iis-kicker">IRIS · INTELLIGENCE</span>
        <h1>The mind of IRIS.</h1>
        <p>This is the read-only educational Intelligence experience. It loads no user financial data and displays no user-specific financial results. It explains how IRIS understands governed financial reality.</p>
      </div>
      <div className="iis-state"><strong>EDUCATIONAL MODE</strong><span>No user data is loaded here.</span></div>
    </section>

    <section className="iis-section iis-principle">
      <div className="iis-section-head"><div><span className="iis-kicker">THE FUNDAMENTAL MODEL</span><h2>Reality is observed. Intelligence understands it.</h2></div></div>
      <div className="iis-principle-grid">
        <article><span>REALITY</span><strong>What exists in the financial world.</strong><p>IRIS observes provider-derived evidence and forms a governed representation of what that evidence supports.</p></article>
        <article><span>INTELLIGENCE</span><strong>How IRIS understands that reality.</strong><p>The hierarchy connects, interprets, compares, reasons over and recursively composes governed information.</p></article>
        <article><span>ONE SYSTEM</span><strong>Two experiences. One connected system.</strong><p>The Financial Life experience and Intelligence experience remain connected through shared evidence, state and lineage without duplicating each other's purpose.</p></article>
      </div>
    </section>

    <section className="iis-section">
      <div className="iis-section-head"><div><span className="iis-kicker">AUTHORITATIVE FOUNDATION</span><h2>Eight domains define the architectural foundation.</h2></div><p>The domains are not eight intelligence levels.</p></div>
      <div className="iis-domain-grid">{domains.map(([number, name, detail]) => <article key={name}><span>{number}</span><strong>{name}</strong><p>{detail}</p></article>)}</div>
      <div className="iis-boundary-note"><strong>Current runtime boundary:</strong> seven domains are executable in the present Sandbox evidence path. Statements is Domain 8 architecturally and is deliberately deferred until real banking; it is not simulated or treated as observed.</div>
    </section>

    <section className="iis-section">
      <div className="iis-section-head"><div><span className="iis-kicker">UNBOUNDED SEMANTIC HIERARCHY</span><h2>No artificial maximum level.</h2></div><p>The following are conceptual reasoning stages, not a finite hierarchy ceiling.</p></div>
      <div className="iis-stage-list">{stages.map(([name, purpose, detail], index) => <article key={name}><div className="iis-stage-index">{String(index + 1).padStart(2, "0")}</div><div><strong>{name}</strong><span>{purpose}</span><p>{detail}</p></div></article>)}</div>
    </section>

    <section className="iis-section">
      <div className="iis-section-head"><div><span className="iis-kicker">GRAPH, NOT TREE</span><h2>Many parents. Many paths. Recursive lineage.</h2></div><p>Intelligence nodes remain connected to the reasoning and evidence that produced them.</p></div>
      <div className="iis-traversal-grid">{paths.map((path, index) => <article key={path}><span>PATH {String(index + 1).padStart(2, "0")}</span><strong>{path}</strong><p>Forward and reverse traversal are first-class architectural requirements.</p></article>)}</div>
    </section>

    <section className="iis-section iis-integrity">
      <div><span className="iis-kicker">INTELLIGENCE INTEGRITY</span><h2>Read-only does not mean shallow.</h2><p>The Intelligence side can teach the complete hierarchy, graph structure, evidence gates, lineage, uncertainty and recursive composition without exposing a user's financial records. User-specific intelligence results belong on the connected Financial Life / Results experience.</p></div>
      <div className="iis-integrity-list">
        <div><strong>Unknown ≠ zero</strong><span>Missing evidence remains missing.</span></div>
        <div><strong>Available ≠ observed</strong><span>Provider capability never becomes user evidence by itself.</span></div>
        <div><strong>Persistence ≠ proof</strong><span>Stored nodes still require semantic and evidence validation.</span></div>
        <div><strong>Prediction ≠ observation</strong><span>Forward reasoning remains explicitly forward-looking.</span></div>
        <div><strong>Correlation ≠ causation</strong><span>Causal language requires appropriate support.</span></div>
        <div><strong>Depth ≠ fixed levels</strong><span>Runtime limits do not cap semantic composition.</span></div>
      </div>
    </section>

    <section className="iis-section iis-handoff">
      <div><span className="iis-kicker">CONNECTED EXPERIENCE</span><h2>Explore your reality on the other side.</h2><p>The Financial Life experience is where user-specific observations, results and the report journey belong. Intelligence remains the educational view of the reasoning system behind them.</p></div>
      <div className="iis-actions"><button type="button" onClick={() => go?.("iris")}>Open Financial Life →</button><button type="button" onClick={() => go?.("iris/evidence")}>Explore Evidence →</button></div>
    </section>
  </main>;
}
