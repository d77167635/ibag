import { supabaseAdmin } from "../config/supabase.js";
import type { IrisRun, IrisRunStatus } from "./irisExecutionTypes.js";

const TRANSITIONS: Record<IrisRunStatus, IrisRunStatus[]> = {
  PLANNED: ["EXECUTING", "FAILED"],
  EXECUTING: ["EXECUTED", "FAILED"],
  EXECUTED: ["VALIDATING", "FAILED"],
  VALIDATING: ["VALIDATED", "VALIDATION_FAILED", "FAILED"],
  VALIDATED: ["CERTIFYING", "FAILED"],
  CERTIFYING: ["CERTIFIED", "NOT_CERTIFIED", "FAILED"],
  CERTIFIED: [],
  FAILED: [],
  VALIDATION_FAILED: [],
  NOT_CERTIFIED: [],
};

export async function createRun(input: Omit<IrisRun, "id" | "created_at" | "updated_at">): Promise<IrisRun> {
  const { data, error } = await supabaseAdmin.from("iris_runs").insert(input).select("*").single();
  if (error) throw error;
  return data as IrisRun;
}

export async function getRun(userId: string, runId: string): Promise<IrisRun | null> {
  const { data, error } = await supabaseAdmin.from("iris_runs").select("*").eq("id", runId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as IrisRun | null) ?? null;
}

export async function transitionRun(userId: string, runId: string, nextStatus: IrisRunStatus, patch: Record<string, unknown> = {}): Promise<IrisRun> {
  const current = await getRun(userId, runId);
  if (!current) throw new Error("IRIS_RUN_NOT_FOUND");
  if (!TRANSITIONS[current.status].includes(nextStatus)) throw new Error(`IRIS_ILLEGAL_RUN_TRANSITION:${current.status}->${nextStatus}`);
  const { data, error } = await supabaseAdmin.from("iris_runs").update({ status: nextStatus, ...patch, updated_at: new Date().toISOString() }).eq("id", runId).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return data as IrisRun;
}

export async function failRun(userId: string, runId: string, failureCode: string, failureMessage: string): Promise<IrisRun> {
  const current = await getRun(userId, runId);
  if (!current) throw new Error("IRIS_RUN_NOT_FOUND");
  if (current.status === "CERTIFIED" || current.status === "FAILED" || current.status === "VALIDATION_FAILED" || current.status === "NOT_CERTIFIED") return current;
  const { data, error } = await supabaseAdmin.from("iris_runs").update({ status: "FAILED", failure_code: failureCode, failure_message: failureMessage, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", runId).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return data as IrisRun;
}
