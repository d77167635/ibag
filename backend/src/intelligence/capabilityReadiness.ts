export type CapabilityContract = {
  key: string;
  label: string;
  capability_group: string;
  description: string | null;
  metadata: Record<string, unknown>;
  active: boolean;
};

const metadata = (c: CapabilityContract) => c.metadata ?? {};

function contractValue(c: CapabilityContract, key: string): unknown {
  return metadata(c)[key];
}

/**
 * Classifies a persisted contract without treating catalog presence as evidence.
 * A registered active capability is discoverable; it becomes ready only when
 * its own evidence/runtime proof is present and every declared dependency is
 * also ready. A missing or non-ready dependency blocks safe composition.
 */
export function classifyCapabilityContract(
  contract: CapabilityContract,
  contracts: CapabilityContract[],
): "discoverable" | "ready" | "blocked" {
  const dependencies = Array.isArray(contractValue(contract, "dependencies"))
    ? (contractValue(contract, "dependencies") as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  for (const dependency of dependencies) {
    const target = contracts.find(candidate => candidate.key === dependency);
    if (!target) return "blocked";
    const targetEvidenceReady = contractValue(target, "evidence_ready") === true;
    const targetRuntimeProven = contractValue(target, "runtime_proven") === true;
    if (!targetEvidenceReady || !targetRuntimeProven) return "blocked";
  }

  const evidenceReady = contractValue(contract, "evidence_ready") === true;
  const runtimeProven = contractValue(contract, "runtime_proven") === true;
  return evidenceReady && runtimeProven ? "ready" : "discoverable";
}
