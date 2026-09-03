import "server-only";

import { getBusinessContext } from "@/features/team/data/business-context";

export type WorkspaceContact = { userId: string; displayName: string; phone: string; marketingOptIn: boolean; consentedAt: string | null; optedOutAt: string | null };

export async function getWorkspaceContacts(): Promise<WorkspaceContact[]> {
  const { supabase, businessId, role } = await getBusinessContext();
  if (role !== "owner") return [];
  const { data: contacts, error } = await supabase
    .from("workspace_contacts")
    .select("user_id, phone_e164, marketing_opt_in, marketing_consent_at, marketing_opted_out_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Contacts could not be loaded: ${error.message}`);
  const userIds = contacts.map((contact) => contact.user_id);
  const { data: profiles, error: profilesError } = userIds.length ? await supabase.from("profiles").select("id, display_name").in("id", userIds) : { data: [], error: null };
  if (profilesError) throw new Error(`Contact names could not be loaded: ${profilesError.message}`);
  const names = new Map(profiles.map((profile) => [profile.id, profile.display_name || "Reseller"]));
  return contacts.map((contact) => ({ userId: contact.user_id, displayName: names.get(contact.user_id) ?? "Reseller", phone: contact.phone_e164, marketingOptIn: contact.marketing_opt_in, consentedAt: contact.marketing_consent_at, optedOutAt: contact.marketing_opted_out_at }));
}
