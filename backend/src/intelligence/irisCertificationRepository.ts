import { supabaseAdmin } from "../config/supabase.js";
import type { IrisCertification, IrisCertificationState } from "./irisExecutionTypes.js";

export async function recordCertification(input: Omit<IrisCertification, "id" | "created_at">): Promise<IrisCertification> {
  const { data, error } = await supabaseAdmin.from("iris_certifications").insert(input).select("*").single();
  if (error) throw error;
  return data as IrisCertification;
}

export async function getRunCertifications(userId: string, runId: string): Promise<IrisCertification[]> {
  const { data, error } = await supabaseAdmin.from("iris_certifications").select("*").eq("run_id", runId).eq("user_id", userId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as IrisCertification[];
}

export async function updateExecutionCertification(userId: string, executionId: string, status: IrisCertificationState): Promise<void> {
  const { error } = await supabaseAdmin.from("iris_execution_records").update({ certification_status: status }).eq("id", executionId).eq("user_id", userId);
  if (error) throw error;
}
