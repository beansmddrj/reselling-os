"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setInventoryProductArchivedAction(unitId: string, archived: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(unitId)) return { ok: false as const, error: "This inventory item is invalid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_inventory_product_archived", { target_unit_id: unitId, should_archive: archived });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${unitId}`);
  revalidatePath("/sales");
  return { ok: true as const };
}
