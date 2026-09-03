import { SettingsHub } from "@/features/settings/components/settings-hub";
import { TeamPanel } from "@/features/team/components/team-panel";
import { getBusinessContext } from "@/features/team/data/business-context";
import { getTeamPanelData } from "@/features/team/data/team-repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [{ supabase, businessId, role, userId }, team] = await Promise.all([getBusinessContext(), getTeamPanelData()]);
  const [businessResult, profileResult, contactResult] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", businessId).single(),
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    supabase.from("workspace_contacts").select("phone_e164, marketing_opt_in").eq("business_id", businessId).eq("user_id", userId).maybeSingle(),
  ]);
  if (businessResult.error) throw new Error(`Settings could not load: ${businessResult.error.message}`);
  if (profileResult.error) throw new Error(`Settings could not load: ${profileResult.error.message}`);
  if (contactResult.error) throw new Error(`Contact preferences could not load: ${contactResult.error.message}`);
  return <SettingsHub businessName={businessResult.data.name} displayName={profileResult.data.display_name ?? "Reseller"} contactPhone={contactResult.data?.phone_e164 ?? ""} contactMarketingOptIn={contactResult.data?.marketing_opt_in ?? false} isOwner={role === "owner"} canManageAdmin={role === "owner" || role === "admin"} team={<TeamPanel team={team}/>}/>;
}
