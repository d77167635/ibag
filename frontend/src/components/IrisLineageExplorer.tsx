import { useState } from "react";
import { api } from "../api/backend";
import type { ConsumerReportRuntimeLineage, IrisReverseLineageResponse } from "../contracts/irisConsumer";

type Props = { lineage: ConsumerReportRuntimeLineage | null };

export function IrisLineageExplorer({ lineage }: Props) {
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [reverse, setReverse] = useState<IrisReverseLineageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function explore(evidenceId: string) {
    if (!lineage) return;
    setSelectedEvidence(evidenceId); setLoading(true); setError(null); setReverse(null);
    try {
      setReverse(await api.getIrisEvidenceReverseLineage(evidenceId, lineage.run_id ?? "", lineage.execution_id ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }

  if (!lineage) return <p className="iis-note">No executed runtime lineage is available for this report.</p>;
  return <div className="iis-boundary">
    <p><strong>Runtime resolution:</strong> {lineage.resolution_state}</p>
    <p><strong>Intelligence nodes:</strong> {lineage.intelligence_node_ids.length ? lineage.intelligence_node_ids.join(", ") : "None resolved"}</p>
    <p><strong>Recursive upstream nodes:</strong> {lineage.upstream_intelligence_node_ids.length ? lineage.upstream_intelligence_node_ids.join(", ") : "None resolved"}</p>
    <p><strong>Run-bound evidence:</strong></p>
    {lineage.run_evidence_ids.length ? <ul>{lineage.run_evidence_ids.map((id) => <li key={id}><button type="button" onClick={() => explore(id)} disabled={loading && selectedEvidence === id}>{loading && selectedEvidence === id ? "Tracing…" : `Trace evidence ${id}`}</button></li>)}</ul> : <p>None resolved.</p>}
    {error ? <p className="iis-note">Reverse traversal unavailable: {error}</p> : null}
    {reverse ? <div className="iis-boundary">
      <p><strong>Reverse traversal</strong></p>
      <p>Evidence → intelligence → report</p>
      <p><strong>Evidence:</strong> {reverse.evidence_id}</p>
      <p><strong>Intelligence nodes:</strong> {reverse.intelligence_node_ids.length ? reverse.intelligence_node_ids.join(", ") : "None resolved"}</p>
      <p><strong>Reports:</strong> {reverse.report_ids.length ? reverse.report_ids.join(", ") : "None resolved"}</p>
      {reverse.limitation ? <p className="iis-note">{reverse.limitation}</p> : null}
    </div> : null}
    {lineage.limitation ? <p className="iis-note">{lineage.limitation}</p> : null}
  </div>;
}
