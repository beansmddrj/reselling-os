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

function normalizePhone(phoneInput: string) {
  return phoneInput.trim().replace(/[\s().-]/g, "");
}

export async function updateContactPreferencesAction(phoneInput: string, marketingOptIn: boolean) {
  const phone = normalizePhone(phoneInput);
  const { supabase, userId, businessId } = await getBusinessContext();
  if (!phone) {
    const { error } = await supabase.from("workspace_contacts").delete().eq("business_id", businessId).eq("user_id", userId);
    if (error) return { ok: false as const, message: error.message };
    revalidatePath("/settings");
    return { ok: true as const, message: "Phone number removed." };
  }
  if (!/^\+[1-9][0-9]{6,14}$/.test(phone)) return { ok: false as const, message: "Use a full number with country code, like +13035551234." };

  const { data: existing, error: existingError } = await supabase
    .from("workspace_contacts")
    .select("phone_e164, marketing_opt_in, marketing_consent_at, marketing_opted_out_at")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) return { ok: false as const, message: existingError.message };

  const now = new Date().toISOString();
  const phoneChanged = existing?.phone_e164 !== phone;
  const { error } = await supabase.from("workspace_contacts").upsert({
    business_id: businessId,
    user_id: userId,
    phone_e164: phone,
    marketing_opt_in: marketingOptIn,
    marketing_consent_at: marketingOptIn ? (phoneChanged || !existing?.marketing_opt_in ? now : existing.marketing_consent_at) : existing?.marketing_consent_at ?? null,
    marketing_opted_out_at: marketingOptIn ? null : existing?.marketing_opt_in ? now : existing?.marketing_opted_out_at ?? null,
    marketing_consent_version: marketingOptIn ? "v1" : existing?.marketing_consent_at ? "v1" : null,
  }, { onConflict: "business_id,user_id" });
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/settings");
  revalidatePath("/settings/admin");
  return { ok: true as const, message: marketingOptIn ? "Phone and future text permission saved." : "Phone saved. You are not opted into marketing texts." };
}
