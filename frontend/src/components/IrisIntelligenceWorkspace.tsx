import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { IrisIntelligenceScreens } from "./IrisIntelligenceScreens";
import { IrisCatalog } from "./IrisCatalog";

function DecisionLab({ go }: { go?: (page: string) => void }) {
  const [question, setQuestion] = useState("");
  const [amount, setAmount] = useState("");
  const [horizon, setHorizon] = useState("30");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setError(null);
    try {
      setResult(await api.runDecisionLab({ question: question.trim() || undefined, amount: amount ? Number(amount) : undefined, horizon_days: Number(horizon) || 30 }));
    } catch (e) { setError(e instanceof Error ? e.message : "Decision Lab could not run."); }
    finally { setLoading(false); }
  };
  return <div className="iis-screen">
    <div className="iis-header"><span className="eyebrow">IRIS / DECISION LAB</span><h1>Decide with evidence.</h1><p>Test a hypothetical against your observed financial evidence. Simulation never changes provider or account state.</p></div>
    <div className="iis-grid">
      <section className="iis-card"><h2>Question</h2><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="What are you considering?" rows={4} />
        <label>Hypothetical amount<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Optional" /></label>
        <label>Horizon (days)<input inputMode="numeric" value={horizon} onChange={e => setHorizon(e.target.value)} /></label>
        <button type="button" onClick={run} disabled={loading}>{loading ? "Analyzing…" : "Run Decision Lab →"}</button>
        {error && <p role="alert">{error}</p>}
      </section>
      {result && <section className="iis-card"><h2>{result.title ?? "Decision analysis"}</h2><p>{result.summary ?? result.basis}</p>{Array.isArray(result.options) && <div>{result.options.map((o: any, i: number) => <article key={o.id ?? i}><strong>{o.label ?? o.name ?? `Option ${i + 1}`}</strong><p>{o.explanation ?? o.reason ?? ""}</p></article>)}</div>}<small>Evidence state: {result.evidence_state ?? result.evidence ?? "calculated"}. Hypothetical outputs are calculations, not observations.</small></section>}
    </div>
    <button type="button" onClick={() => go?.("iris")}>← Back to Iris intelligence</button>
  </div>;
}

export function IrisIntelligenceWorkspace({ page = "iris", go }: { page?: string; go?: (page: string) => void }) {
  const [intel, setIntel] = useState<any>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [plaidError, setPlaidError] = useState<string | null>(null);
  const [hasConnectedData, setHasConnectedData] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    api.getIntelligence().then(data => { if (alive) setIntel(data); }).catch(err => { if (alive) setIntelError(err instanceof Error ? err.message : "Unable to load Iris intelligence"); });
    api.getPlaidSurface().then(plaid => { if (alive) setHasConnectedData(Array.isArray(plaid?.items) && plaid.items.length > 0); }).catch(err => { if (alive) setPlaidError(err instanceof Error ? err.message : "Unable to inspect connected evidence"); });
    return () => { alive = false; };
  }, []);

  const openPlaid = () => { window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#workspace/plaid`); window.dispatchEvent(new HashChangeEvent("hashchange")); };
  if (page === "iris/catalog") return <IrisCatalog go={go} />;
  if (page === "iris/decision-lab") return <DecisionLab go={go} />;
  if (intelError && !intel) return <div className="iis-screen"><div className="iis-empty"><strong>Iris intelligence is unavailable.</strong><p>{intelError}</p></div></div>;
  if (hasConnectedData === false) return <div className="iis-screen"><div className="iis-empty"><span className="eyebrow">IRIS</span><strong>Your intelligence workspace is ready.</strong><p>Iris has no financial observations for this account yet. Connect a real financial institution through the Plaid control plane and Iris will begin building evidence from the authorized data.</p><p>No financial data is invented, copied from another account, seeded, or simulated.</p><button type="button" onClick={openPlaid}>Open Plaid control plane →</button>{plaidError && <small>Evidence status is temporarily unavailable; you can still open the Plaid control plane.</small>}</div></div>;
  return <IrisIntelligenceScreens page={page} intel={intel} go={go} />;
}
