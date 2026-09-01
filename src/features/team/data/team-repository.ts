import "server-only";

import { getBusinessContext } from "@/features/team/data/business-context";

export type TeamPanelData = {
  role: "owner" | "member";
  members: { userId: string; displayName: string; role: "owner" | "member" }[];
  pendingInvites: { id: string; email: string; createdAt: string }[];
  incomingInvites: { id: string; email: string; ownerName: string }[];
};

export async function getTeamPanelData(): Promise<TeamPanelData> {
  const { supabase, userId, ownerId, role } = await getBusinessContext();
  const [membersResult, outgoingResult, incomingResult] = await Promise.all([
    supabase.from("business_members").select("business_owner_id, user_id, role").eq("business_owner_id", ownerId),
    role === "owner" ? supabase.from("business_invites").select("id, email, created_at").eq("business_owner_id", ownerId).is("accepted_at", null).order("created_at") : Promise.resolve({ data: [], error: null }),
    supabase.from("business_invites").select("id, email, business_owner_id").is("accepted_at", null).neq("business_owner_id", userId),
  ]);
  if (membersResult.error) throw new Error(`Team members could not be loaded: ${membersResult.error.message}`);
  if (outgoingResult.error) throw new Error(`Invitations could not be loaded: ${outgoingResult.error.message}`);
  if (incomingResult.error) throw new Error(`Invitations could not be loaded: ${incomingResult.error.message}`);
  const profileIds = [...new Set([...membersResult.data.map((member) => member.user_id), ...incomingResult.data.map((invite) => invite.business_owner_id)])];
  const profilesResult = profileIds.length ? await supabase.from("profiles").select("id, display_name").in("id", profileIds) : { data: [], error: null };
  if (profilesResult.error) throw new Error(`Team profiles could not be loaded: ${profilesResult.error.message}`);
  const names = new Map(profilesResult.data.map((profile) => [profile.id, profile.display_name || "Reseller"]));
  return {
    role,
    members: membersResult.data.map((member) => ({ userId: member.user_id, displayName: names.get(member.user_id) ?? "Reseller", role: member.role })),
    pendingInvites: outgoingResult.data.map((invite) => ({ id: invite.id, email: invite.email, createdAt: invite.created_at })),
    incomingInvites: incomingResult.data.map((invite) => ({ id: invite.id, email: invite.email, ownerName: names.get(invite.business_owner_id) ?? "Business owner" })),
  };
}
