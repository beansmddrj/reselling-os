"use server";

import { revalidatePath } from "next/cache";
import { getBusinessContext } from "@/features/team/data/business-context";

function clean(value: string, limit: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

export async function updateBusinessNameAction(nameInput: string) {
  const name = clean(nameInput, 120);
  if (!name) return { ok: false as const, message: "Give your business a name first." };
  const { supabase, userId, businessId, role } = await getBusinessContext();
  if (role !== "owner") return { ok: false as const, message: "Only the business owner can change this name." };
  const { error } = await supabase.from("businesses").update({ name }).eq("id", businessId).eq("owner_id", userId);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/settings");
  return { ok: true as const, message: "Business name updated." };
}

export async function updateDisplayNameAction(displayNameInput: string) {
  const displayName = clean(displayNameInput, 80);
  if (!displayName) return { ok: false as const, message: "Enter the name your team should see." };
  const { supabase, userId } = await getBusinessContext();
  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true as const, message: "Your display name updated." };
}
