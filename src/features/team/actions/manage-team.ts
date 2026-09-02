"use server";

import { revalidatePath } from "next/cache";
import { getBusinessContext } from "@/features/team/data/business-context";

export async function inviteTeamMemberAction(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, message: "Enter your friend’s complete email address." };
  const { supabase, userId, businessId, ownerId, role } = await getBusinessContext();
  if (role !== "owner" || ownerId !== userId) return { ok: false as const, message: "Only the business owner can invite people." };
  const { error } = await supabase.from("business_invites").insert({ business_id: businessId, business_owner_id: ownerId, email, invited_by: userId });
  if (error?.code === "23505") return { ok: false as const, message: "That email already has a pending invitation." };
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/");
  return { ok: true as const, message: `Invitation ready for ${email}.` };
}

export async function acceptTeamInviteAction(inviteId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return { ok: false as const, message: "This invitation is invalid." };
  const { supabase } = await getBusinessContext();
  const { error } = await supabase.rpc("accept_business_invite", { invite_id: inviteId });
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/intake");
  return { ok: true as const, message: "You joined the shared business." };
}

export async function removeTeamMemberAction(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false as const, message: "This team member is invalid." };
  const { supabase, userId: actorId, businessId, ownerId, role } = await getBusinessContext();
  if (role !== "owner" || ownerId !== actorId) return { ok: false as const, message: "Only the business owner can remove people." };
  const { error } = await supabase.from("business_members").delete().eq("business_id", businessId).eq("user_id", userId);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/");
  return { ok: true as const, message: "Team member removed." };
}

export async function cancelTeamInviteAction(inviteId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return { ok: false as const, message: "This invitation is invalid." };
  const { supabase, userId, businessId, ownerId, role } = await getBusinessContext();
  if (role !== "owner" || ownerId !== userId) return { ok: false as const, message: "Only the business owner can cancel invitations." };
  const { error } = await supabase.from("business_invites").delete().eq("business_id", businessId).eq("id", inviteId);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/");
  return { ok: true as const, message: "Invitation canceled." };
}
