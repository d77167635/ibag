import { supabaseAdmin } from "../config/supabase.js";
import type { IrisValidationResult } from "./irisExecutionTypes.js";

export async function recordValidation(input: Omit<IrisValidationResult, "id" | "created_at">): Promise<IrisValidationResult> {
  const { data, error } = await supabaseAdmin.from("iris_validation_results").insert(input).select("*").single();
  if (error) throw error;
  return data as IrisValidationResult;
}

export async function getRunValidations(userId: string, runId: string): Promise<IrisValidationResult[]> {
  const { data, error } = await supabaseAdmin.from("iris_validation_results").select("*").eq("run_id", runId).eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as IrisValidationResult[];
}
