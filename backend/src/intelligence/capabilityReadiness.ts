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

const dependencyKeys = (contract: CapabilityContract): string[] => {
  const value = contractValue(contract, "dependencies");
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
};

/**
 * Classifies a persisted contract without treating catalog presence as evidence.
 * A registered active capability is discoverable; it becomes ready only when
 * its own evidence/runtime proof is present and every declared dependency is
 * also ready. Cyclic, missing, inactive, or non-ready dependencies fail closed.
 */
export function classifyCapabilityContract(
  contract: CapabilityContract,
  contracts: CapabilityContract[],
): "discoverable" | "ready" | "blocked" {
  const byKey = new Map(contracts.map(candidate => [candidate.key, candidate]));
  const visiting = new Set<string>();
  const memo = new Map<string, "discoverable" | "ready" | "blocked">();

  const classify = (candidate: CapabilityContract): "discoverable" | "ready" | "blocked" => {
    const cached = memo.get(candidate.key);
    if (cached) return cached;
    if (!candidate.active) return "blocked";
    if (visiting.has(candidate.key)) return "blocked";

    visiting.add(candidate.key);
    for (const dependency of dependencyKeys(candidate)) {
      const target = byKey.get(dependency);
      if (!target || classify(target) !== "ready") {
        visiting.delete(candidate.key);
        memo.set(candidate.key, "blocked");
        return "blocked";
      }
    }
    visiting.delete(candidate.key);

    const evidenceReady = contractValue(candidate, "evidence_ready") === true;
    const runtimeProven = contractValue(candidate, "runtime_proven") === true;
    const state = evidenceReady && runtimeProven ? "ready" : "discoverable";
    memo.set(candidate.key, state);
    return state;
  };

  return classify(contract);
}
