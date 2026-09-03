import "server-only";

import { getBusinessContext } from "@/features/team/data/business-context";

export type WorkspaceErrorReport = { id: string; source: string; message: string; digest: string | null; occurredAt: string };

export async function getRecentWorkspaceErrorReports(): Promise<WorkspaceErrorReport[]> {
  const { supabase, businessId, role } = await getBusinessContext();
  if (role !== "owner" && role !== "admin") return [];
  const { data, error } = await supabase
    .from("workspace_error_reports")
    .select("id, source, message, digest, occurred_at")
    .eq("business_id", businessId)
    .order("occurred_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`Error reports could not be loaded: ${error.message}`);
  return data.map((report) => ({ id: report.id, source: report.source, message: report.message, digest: report.digest, occurredAt: report.occurred_at }));
}
