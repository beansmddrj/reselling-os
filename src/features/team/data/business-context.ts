import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getBusinessContext() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) throw new Error("Your session could not be verified. Sign in again.");

  const { data: memberships, error } = await supabase
    .from("business_members")
    .select("business_owner_id, user_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at");
  if (error) throw new Error(`Your business workspace could not be loaded: ${error.message}`);
  const membership = memberships.find((item) => item.role === "member") ?? memberships[0];
  if (!membership) throw new Error("No business workspace is connected to this account.");
  return { supabase, userId, ownerId: membership.business_owner_id, role: membership.role };
}
