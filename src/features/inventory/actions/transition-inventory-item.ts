"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InventoryStatus } from "@/features/inventory/types";

export type InventoryTransitionState = { status: "idle" | "success" | "error"; message: string };
export const initialInventoryTransitionState: InventoryTransitionState = { status: "idle", message: "" };

export async function transitionInventoryItemAction(
  _previous: InventoryTransitionState,
  formData: FormData,
): Promise<InventoryTransitionState> {
  const unitId = String(formData.get("unitId") ?? "");
  const targetStatus = String(formData.get("targetStatus") ?? "") as InventoryStatus;
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(unitId)) return { status: "error", message: "This inventory item is invalid." };
  if (!(["ready", "active"] as InventoryStatus[]).includes(targetStatus)) return { status: "error", message: "That status change is not allowed." };
  if (targetStatus === "active") {
    try {
      const url = new URL(externalUrl);
      if (!(["http:", "https:"] as string[]).includes(url.protocol)) throw new Error();
    } catch {
      return { status: "error", message: "Paste the full marketplace listing URL, including https://." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_inventory_item", {
    target_unit_id: unitId,
    target_status: targetStatus,
    listing_external_url: externalUrl || null,
  });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${unitId}`);
  return { status: "success", message: targetStatus === "active" ? "Item marked active." : "Item is ready to list." };
}
