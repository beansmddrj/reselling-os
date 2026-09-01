import "server-only";

import { getBusinessContext } from "@/features/team/data/business-context";

export type ActivityItem = { id: string; label: string; actor: string; occurredAt: string };

const labels: Record<string, string> = {
  intake_completed: "Created an inventory item", inventory_updated: "Edited an inventory item",
  inventory_transitioned: "Changed an inventory status", inventory_deleted: "Deleted an inventory item",
  sale_recorded: "Recorded a sale", product_archived: "Archived a listing",
  product_restored: "Restored a listing", restock_status_changed: "Changed a restock status",
  business_invite_created: "Invited a teammate", business_invite_accepted: "Joined the workspace",
};

export async function getActivityFeed(limit = 12): Promise<ActivityItem[]> {
  const { supabase, ownerId } = await getBusinessContext();
  const { data: events, error } = await supabase.from("business_events").select("id, event_type, actor_id, occurred_at").eq("owner_id", ownerId).order("occurred_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Activity could not be loaded: ${error.message}`);
  const actorIds = [...new Set(events.flatMap((event) => event.actor_id ? [event.actor_id] : []))];
  const profiles = actorIds.length ? await supabase.from("profiles").select("id, display_name").in("id", actorIds) : { data: [], error: null };
  if (profiles.error) throw new Error(`Activity names could not be loaded: ${profiles.error.message}`);
  const names = new Map(profiles.data.map((profile) => [profile.id, profile.display_name || "Teammate"]));
  return events.map((event) => ({ id: event.id, label: labels[event.event_type] ?? event.event_type.replaceAll("_", " "), actor: event.actor_id ? names.get(event.actor_id) ?? "Teammate" : "System", occurredAt: event.occurred_at }));
}
