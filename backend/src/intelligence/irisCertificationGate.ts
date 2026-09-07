import { createHash } from "node:crypto";
import type { IrisCertificationState, IrisExecutionRecord, IrisRun, IrisValidationResult } from "./irisExecutionTypes.js";

export interface CertificationDecision {
  status: IrisCertificationState;
  reasons: string[];
  certification_hash: string;
}

export function decideCertification(input: {
  run: IrisRun;
  execution: IrisExecutionRecord;
  evidenceCount: number;
  validations: IrisValidationResult[];
  ownershipValid: boolean;
  temporalValid: boolean;
}): CertificationDecision {
  const reasons: string[] = [];
  if (!input.ownershipValid) reasons.push("USER_ISOLATION_FAILED");
  if (!input.evidenceCount) reasons.push("NO_EVIDENCE_BOUND_TO_RUN");
  if (input.execution.execution_state !== "EXECUTED") reasons.push("EXECUTION_INCOMPLETE");
  if (!input.execution.input_hash) reasons.push("INPUT_HASH_MISSING");
  if (!input.execution.output_hash) reasons.push("OUTPUT_HASH_MISSING");
  if (!input.temporalValid) reasons.push("TEMPORAL_BOUNDARY_INVALID");
  if (!input.validations.length) reasons.push("VALIDATION_MISSING");
  if (input.validations.some(v => v.status === "UNKNOWN")) reasons.push("VALIDATION_UNKNOWN");
  if (input.validations.some(v => v.status === "FAIL")) reasons.push("VALIDATION_FAILED");
  if (input.validations.some(v => v.severity === "CRITICAL" && v.status !== "PASS")) reasons.push("CRITICAL_VALIDATION_UNRESOLVED");
  if (input.execution.evidence_state === "INSUFFICIENT_EVIDENCE") reasons.push("INSUFFICIENT_EVIDENCE");

  const canonical = JSON.stringify({ run_id: input.run.id, execution_id: input.execution.id, reasons: [...new Set(reasons)].sort(), input_hash: input.execution.input_hash, output_hash: input.execution.output_hash });
  const certification_hash = createHash("sha256").update(canonical).digest("hex");
  return { status: reasons.length ? "NOT_CERTIFIED" : "CERTIFIED", reasons: [...new Set(reasons)].sort(), certification_hash };
}
