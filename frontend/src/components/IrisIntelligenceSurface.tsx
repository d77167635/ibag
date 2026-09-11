import "./IrisIntelligenceSurface.css";

type Props = { page?: string; go?: (page: string) => void };
type View = { label: string; title: string; intro: string; sections: Array<[string, string, string]> };

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

const views: Record<string, View> = {
  "iris/intelligence": {
    label: "Overview", title: "The mind of IRIS.", intro: "The read-only educational Intelligence experience. It loads no user financial data and explains the reasoning machinery behind governed financial intelligence.", sections: [
      ["One system", "Reality and intelligence are connected dimensions of IRIS.", "Financial Life exposes user-specific reality and results; this experience explains the reasoning system without crossing into user data."],
      ["Depth", "Read-only does not mean shallow.", "The educational surface can traverse hierarchy, graph relationships, lineage, uncertainty, scenarios and higher-order composition without a user record."],
      ["Boundary", "Conceptual examples stay conceptual.", "Actual user-specific lineage belongs to the Financial Life experience and requires governed runtime evidence."],
    ],
  },
  "iris/intelligence/hierarchy": {
    label: "Hierarchy", title: "From IRIS to unbounded intelligence.", intro: "Level 1 is IRIS. Level 2 is the eight authoritative domains. Level 3 and beyond is recursively generated intelligence; those levels are not a fixed page inventory.", sections: [
      ["Level 1", "IRIS is the system-level intelligence identity.", "It governs the relationship between observed financial reality, evidence and intelligence."],
      ["Level 2", "Eight authoritative domains form the foundation.", "They are domains of reality, not eight intelligence depths."],
      ["Level 3+", "Intelligence can become upstream intelligence.", "A valid derived node can feed another composition, preserving exact upstream identities and recursive ancestry."],
    ],
  },
  "iris/intelligence/evidence": {
    label: "Evidence → Intelligence", title: "Evidence is the boundary.", intro: "IRIS does not jump from provider capability to conclusion. Evidence passes through governed states before it becomes intelligence-consumable.", sections: [
      ["State chain", "Available is not observed.", "Available, consented, authorized, provider response received, persisted, certified, normalized and intelligence-consumable are separate states."],
      ["Transformation", "Evidence can become canonical state and then intelligence.", "Each transformation must retain its provenance and limitations."],
      ["Fail closed", "Insufficient evidence limits the result.", "A missing stage cannot be replaced with a plausible-looking value."],
    ],
  },
  "iris/intelligence/graph": {
    label: "Graph", title: "Many parents. Many paths.", intro: "IRIS intelligence is a graph rather than a fixed tree. Relationships can cross domains and converge into new derived intelligence.", sections: [
      ["Nodes", "A node represents a governed intelligence result or composition.", "Persistence alone does not prove that the node was semantically produced."],
      ["Edges", "Edges preserve upstream relationships.", "Exact upstream identities make forward and reverse traversal possible."],
      ["Cross-domain", "One composition may depend on multiple domains.", "The execution boundary determines which evidence can legitimately participate."],
    ],
  },
  "iris/intelligence/forward": {
    label: "Forward Reasoning", title: "Follow the reasoning forward.", intro: "Forward traversal explains how IRIS can move from observed reality toward increasingly abstract intelligence.", sections: [
      ["Start", "Provider observation → source field → governed evidence.", "The chain begins with what was actually returned and persisted."],
      ["Compose", "Canonical state → interpretation → relationships → higher-order intelligence.", "Each step adds a governed transformation rather than hiding the previous layer."],
      ["Arrive", "Intelligence → result/report/scenario where applicable.", "A result is only publishable when its required evidence and runtime gates are satisfied."],
    ],
  },
  "iris/intelligence/reverse": {
    label: "Reverse Lineage", title: "Ask why the conclusion exists.", intro: "Reverse traversal is the proof-oriented counterpart to forward reasoning: start at a result and trace its actual dependencies backward.", sections: [
      ["Result", "Result → contributing intelligence nodes.", "The system identifies exact runtime identities rather than relying on names alone."],
      ["Evidence", "Intelligence → canonical state → governed evidence.", "Only persisted, governed lineage can support factual reverse traversal."],
      ["Source", "Evidence → source-field observation → provider observation.", "If exact lineage is absent, IRIS must say so rather than inventing the path."],
    ],
  },
  "iris/intelligence/recursive": {
    label: "Recursive Intelligence", title: "Intelligence can become upstream intelligence.", intro: "Recursive composition is the mechanism that allows IRIS to move beyond a finite registry of predefined capabilities.", sections: [
      ["Derived node", "A new node can be produced from existing intelligence.", "It must reference exact upstream nodes and preserve recursive ancestry."],
      ["Composition", "Multiple upstream nodes can form a new relationship or synthesis.", "The graph can expand without creating a new hard-coded hierarchy level for every composition."],
      ["No ceiling", "Semantic depth is unbounded.", "Runtime budgets may constrain materialization, but they cannot redefine the architecture's semantic maximum."],
    ],
  },
  "iris/intelligence/relationships": {
    label: "Relationships", title: "Relationships are intelligence, not decoration.", intro: "IRIS understands financial reality through relationships among entities, time, evidence and derived intelligence.", sections: [
      ["Relational", "Nodes may share parents, domains and temporal context.", "Relationships explain how separate observations can participate in one higher-order conclusion."],
      ["Behavioral", "Repeated structures can become behavioral intelligence.", "Observed recurrence and derived behavioral interpretation remain distinguishable."],
      ["Synthesis", "Cross-domain relationships can produce higher-order intelligence.", "The participating evidence boundary must remain explicit."],
    ],
  },
  "iris/intelligence/uncertainty": {
    label: "Uncertainty", title: "Knowing what IRIS does not know.", intro: "A trustworthy intelligence system needs explicit epistemic boundaries, not just conclusions.", sections: [
      ["Unknown", "Unknown is not zero.", "Missing information stays unknown rather than becoming a convenient numeric value."],
      ["Epistemic states", "Observed, derived, inferred, predicted and hypothetical are different.", "Language and UI state must preserve those distinctions."],
      ["Limitations", "Evidence limitations travel with the result.", "Uncertainty and applicability are part of the intelligence, not an afterthought."],
    ],
  },
  "iris/intelligence/scenarios": {
    label: "Scenarios", title: "Prediction is not history.", intro: "Scenarios and counterfactuals allow IRIS to reason about possible futures while keeping hypothetical state separate from observed reality.", sections: [
      ["Prediction", "Forward-looking reasoning remains explicitly predictive.", "A prediction cannot be labeled as an observed fact."],
      ["Counterfactual", "A scenario introduces hypothetical conditions.", "Hypothetical inputs and outputs must remain separate from the user's observed history."],
      ["Consequence", "Possible consequences can inform decisions.", "Scenario intelligence does not mean an action occurred or an outcome was observed."],
    ],
  },
  "iris/intelligence/certification": {
    label: "Certification", title: "Proof before publication.", intro: "IRIS treats execution, evidence, semantic lineage and certification as separate gates. A stored artifact is not automatically a proven result.", sections: [
      ["Execution", "A runtime execution must be independently attributable.", "Run, execution, user and evidence boundaries must agree."],
      ["Semantic proof", "The system must prove the declared transformation was actually consumed.", "Persisted records alone do not establish semantic correctness."],
      ["Publication", "Only qualified results can cross the publication boundary.", "Unqualified, limited or deferred products remain visibly constrained."],
    ],
  },
  "iris/intelligence/higher-order": {
    label: "Higher-Order", title: "Synthesis without a ceiling.", intro: "Higher-order intelligence combines governed intelligence into increasingly abstract relationships, while retaining the path back to evidence.", sections: [
      ["Synthesis", "Existing intelligence becomes input to new intelligence.", "The graph can combine temporal, relational, behavioral and domain-specific structures."],
      ["Recursive lineage", "Every higher-order node retains its ancestry.", "The path remains traversable rather than collapsing into an opaque conclusion."],
      ["Bounded truth", "More abstraction never means less governance.", "Evidence, uncertainty, applicability and certification remain attached at every depth."],
    ],
  },
};

function viewFor(page: string): View { return views[page] ?? views["iris/intelligence"]; }

export function IrisIntelligenceSurface({ page = "iris/intelligence", go }: Props) {
  const view = viewFor(page);
  const isOverview = page === "iris/intelligence";
  return <main className="iris-intelligence-surface">
    <section className="iis-header">
      <div><span className="iis-kicker">IRIS · INTELLIGENCE · EDUCATION</span><h1>{view.title}</h1><p>{view.intro}</p></div>
      <div className="iis-state"><strong>EDUCATIONAL MODE</strong><span>No user data is loaded here.</span></div>
    </section>

    <section className="iis-section iis-intelligence-map">
      <div className="iis-section-head"><div><span className="iis-kicker">EXPLORE THE INTELLIGENCE SYSTEM</span><h2>{view.label}</h2></div><p>Every surface is a doorway into deeper concepts.</p></div>
      <nav className="iis-map-grid" aria-label="Intelligence education surfaces">
        {Object.entries(views).map(([key, item]) => <button key={key} type="button" className={key === page ? "active" : ""} onClick={() => go?.(key)}><strong>{item.label}</strong><span>{item.title}</span></button>)}
      </nav>
    </section>

    {isOverview && <>
      <section className="iis-section iis-principle"><div className="iis-section-head"><div><span className="iis-kicker">THE FUNDAMENTAL MODEL</span><h2>Reality is observed. Intelligence understands it.</h2></div></div><div className="iis-principle-grid"><article><span>REALITY</span><strong>What exists in the financial world.</strong><p>IRIS observes provider-derived evidence and forms a governed representation of what that evidence supports.</p></article><article><span>INTELLIGENCE</span><strong>How IRIS understands that reality.</strong><p>The hierarchy connects, interprets, compares, reasons over and recursively composes governed information.</p></article><article><span>ONE SYSTEM</span><strong>Two experiences. One connected system.</strong><p>Financial Life and Intelligence/Education remain connected through shared system semantics without crossing their data boundaries.</p></article></div></section>
      <section className="iis-section"><div className="iis-section-head"><div><span className="iis-kicker">AUTHORITATIVE FOUNDATION</span><h2>Eight domains define the architectural foundation.</h2></div><p>The domains are not eight intelligence levels.</p></div><div className="iis-domain-grid">{domains.map(([number, name, detail]) => <article key={name}><span>{number}</span><strong>{name}</strong><p>{detail}</p></article>)}</div><div className="iis-boundary-note"><strong>Current runtime boundary:</strong> seven domains are executable in the present Sandbox evidence path. Statements is Domain 8 architecturally and is deliberately deferred until real banking; it is not simulated or treated as observed.</div></section>
      <section className="iis-section"><div className="iis-section-head"><div><span className="iis-kicker">UNBOUNDED SEMANTIC HIERARCHY</span><h2>No artificial maximum level.</h2></div><p>These are conceptual stages, not a finite hierarchy ceiling.</p></div><div className="iis-stage-list">{stages.map(([name, purpose, detail], index) => <article key={name}><div className="iis-stage-index">{String(index + 1).padStart(2, "0")}</div><div><strong>{name}</strong><span>{purpose}</span><p>{detail}</p></div></article>)}</div></section>
    </>}

    <section className="iis-section"><div className="iis-section-head"><div><span className="iis-kicker">DEEP DIVE</span><h2>{view.label}: three layers of understanding.</h2></div><p>Read the meaning, then the mechanics, then the boundary.</p></div><div className="iis-deep-grid">{view.sections.map(([name, meaning, boundary], index) => <article key={name}><span>{String(index + 1).padStart(2, "0")}</span><strong>{name}</strong><h3>{meaning}</h3><p>{boundary}</p></article>)}</div></section>

    <section className="iis-section iis-traversal"><div className="iis-section-head"><div><span className="iis-kicker">TRAVERSAL</span><h2>Go deeper. Then come back.</h2></div><p>Contextual traversal is part of the experience, not a collection of disconnected pages.</p></div><div className="iis-traversal-grid"><article><span>FORWARD</span><strong>Evidence → state → intelligence → synthesis</strong><p>Follow how governed information can become increasingly abstract intelligence.</p></article><article><span>REVERSE</span><strong>Conclusion → intelligence → evidence</strong><p>Follow why a result exists when exact lineage is available.</p></article><article><span>RECURSIVE</span><strong>Node → parents → ancestry → deeper composition</strong><p>Explore intelligence as a graph with no artificial semantic depth ceiling.</p></article></div></section>

    <section className="iis-section iis-integrity"><div><span className="iis-kicker">INTEGRITY</span><h2>Educational depth without user-data leakage.</h2><p>This entire side is read-only education. It does not load user balances, transactions, reports or user-specific intelligence results.</p></div><div className="iis-integrity-list"><div><strong>Unknown ≠ zero</strong><span>Missing evidence remains missing.</span></div><div><strong>Available ≠ observed</strong><span>Provider capability never becomes user evidence by itself.</span></div><div><strong>Persistence ≠ proof</strong><span>Stored nodes still require semantic and evidence validation.</span></div><div><strong>Prediction ≠ observation</strong><span>Forward reasoning remains explicitly forward-looking.</span></div><div><strong>Correlation ≠ causation</strong><span>Causal language requires appropriate support.</span></div><div><strong>Depth ≠ fixed levels</strong><span>Runtime limits do not cap semantic composition.</span></div></div></section>

    <section className="iis-section iis-handoff"><div><span className="iis-kicker">CONNECTED EXPERIENCE</span><h2>Explore the same system from the other dimension.</h2><p>Financial Life is where actual user-specific reality, results, reports, scenarios, decisions and outcomes are encountered. Intelligence remains the educational view of the reasoning system behind them.</p></div><div className="iis-actions"><button type="button" onClick={() => go?.("iris")}>Open Financial Life →</button><button type="button" onClick={() => go?.("iris/evidence")}>Explore User Evidence →</button></div></section>
  </main>;
}
