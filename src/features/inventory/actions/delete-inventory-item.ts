"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DeleteInventoryResult = { ok: true; warning?: string } | { ok: false; error: string };

export async function deleteInventoryItemAction(unitId: string): Promise<DeleteInventoryResult> {
  if (!/^[0-9a-f-]{36}$/i.test(unitId)) return { ok: false, error: "This inventory item is invalid." };
  const supabase = await createClient();
  const { data: photoPaths, error } = await supabase.rpc("delete_inventory_item", { target_unit_id: unitId });
  if (error) return { ok: false, error: error.message };

  let warning: string | undefined;
  if (photoPaths?.length) {
    const { error: storageError } = await supabase.storage.from("intake-photos").remove(photoPaths);
    if (storageError) warning = "The record was deleted, but some stored photo files could not be cleaned up.";
  }
  revalidatePath("/inventory");
  return { ok: true, warning };
}
