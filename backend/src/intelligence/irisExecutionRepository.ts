import { supabaseAdmin } from "../config/supabase.js";
import type { IrisExecutionRecord, IrisExecutionInput, IrisExecutionOutput } from "./irisExecutionTypes.js";

export async function startExecution(input: Omit<IrisExecutionRecord, "id" | "started_at" | "completed_at">): Promise<IrisExecutionRecord> {
  const { data, error } = await supabaseAdmin.from("iris_execution_records").insert({ ...input, execution_state: "EXECUTING", started_at: new Date().toISOString() }).select("*").single();
  if (error) throw error;
  return data as IrisExecutionRecord;
}

export async function completeExecution(userId: string, executionId: string, inputHash: string, outputHash: string, outputSnapshot: unknown): Promise<IrisExecutionRecord> {
  const { data, error } = await supabaseAdmin.from("iris_execution_records").update({ execution_state: "EXECUTED", input_hash: inputHash, output_hash: outputHash, output_snapshot: outputSnapshot, completed_at: new Date().toISOString() }).eq("id", executionId).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return data as IrisExecutionRecord;
}

export async function failExecution(userId: string, executionId: string, errorCode: string, errorMessage: string): Promise<IrisExecutionRecord> {
  const { data, error } = await supabaseAdmin.from("iris_execution_records").update({ execution_state: "FAILED", error_code: errorCode, error_message: errorMessage, completed_at: new Date().toISOString(), certification_status: "NOT_CERTIFIED" }).eq("id", executionId).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return data as IrisExecutionRecord;
}

export async function recordInput(input: IrisExecutionInput): Promise<IrisExecutionInput> {
  const { data, error } = await supabaseAdmin.from("iris_execution_inputs").insert(input).select("*").single();
  if (error) throw error;
  return data as IrisExecutionInput;
}

export async function recordOutput(input: IrisExecutionOutput): Promise<IrisExecutionOutput> {
  const { data, error } = await supabaseAdmin.from("iris_execution_outputs").insert(input).select("*").single();
  if (error) throw error;
  return data as IrisExecutionOutput;
}
