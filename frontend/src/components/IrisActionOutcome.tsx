import { useEffect, useState } from "react";
import { api } from "../api/backend";

type Props = { mode: "action" | "outcomes"; go?: (page: string) => void };

type Outcome = {
  id: string;
  source_type: string;
  source_id: string;
  outcome_type: string;
  outcome_state: string;
  value: Record<string, unknown> | null;
  observed_at: string | null;
  effective_at: string | null;
  evidence_hash: string | null;
  lineage: Record<string, unknown> | null;
};

const title = { action: "Action", outcomes: "Outcomes" } as const;

export function IrisActionOutcome({ mode, go }: Props) {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [loading, setLoading] = useState(mode === "outcomes");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "outcomes") return;
    let active = true;
    void api.getIrisOutcomeObservations()
      .then((result) => { if (active) setOutcomes(result.outcomes ?? []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Outcome observations could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode]);

  if (mode === "action") return <main className="iris4-screen"><div className="iris4-body"><section className="iris-surface"><span className="eyebrow">ACTION BOUNDARY</span><h1>Decide before you act.</h1><p>IRIS can analyze choices, compare scenarios, and preserve your decision context. The current read-only product does not execute bank, card, payment, transfer, investment, or other financial actions.</p><div className="iris-journey-actions"><button type="button" onClick={() => go?.("iris/decisions")}>Review decision →</button><button type="button" onClick={() => go?.("iris/simulation")}>Compare scenario →</button><button type="button" onClick={() => go?.("iris/evidence")}>Verify evidence →</button></div></section><section className="iris-surface"><span className="eyebrow">USER CONTROL</span><h2>No silent execution</h2><p>An analysis, recommendation, or scenario never changes an account by itself. Any future executable action must have its own explicit contract, authorization, confirmation, execution receipt, and observed outcome.</p></section></div></main>;

  return <main className="iris4-screen"><div className="iris4-body"><section className="iris-surface"><span className="eyebrow">OBSERVED OUTCOMES</span><h1>What actually happened?</h1><p>Only persisted outcome observations are shown here. A displayed decision or scenario is not treated as an outcome.</p>{loading && <p>Reading observed outcomes…</p>}{error && <p>{error}</p>}{!loading && !error && outcomes.length === 0 && <p>No observed outcomes are currently available. IRIS will not manufacture one from a decision, recommendation, or scenario.</p>}{outcomes.length > 0 && <div className="iris-metric-grid">{outcomes.map((outcome) => <article className="iris-surface-card" key={outcome.id}><span>{outcome.outcome_type.replaceAll("_", " ")}</span><strong>{outcome.outcome_state.replaceAll("_", " ")}</strong><small>{outcome.observed_at ? new Date(outcome.observed_at).toLocaleString() : "Observation time unavailable"}</small><small>Source: {outcome.source_type}</small></article>)}</div>}</section><section className="iris-surface"><span className="eyebrow">LEARNING BOUNDARY</span><h2>Observation precedes learning.</h2><p>Future learning must be derived from validated outcomes and their evidence lineage, not from what IRIS hoped would happen.</p><button type="button" onClick={() => go?.("iris")}>Return to IRIS →</button></section></div></main>;
}
