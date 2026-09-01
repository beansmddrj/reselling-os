"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InventoryEditState = { status: "idle" | "success" | "error"; message: string };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function moneyToCents(value: string) {
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export async function updateInventoryItemAction(
  _previous: InventoryEditState,
  formData: FormData,
): Promise<InventoryEditState> {
  const unitId = text(formData, "unitId");
  const productName = text(formData, "name");
  const listingTitle = text(formData, "listingTitle");
  const unitCostCents = moneyToCents(text(formData, "acquisitionCost"));
  const askingPriceCents = moneyToCents(text(formData, "askingPrice"));
  const restockStatus = text(formData, "restockStatus");
  if (!/^[0-9a-f-]{36}$/i.test(unitId)) return { status: "error", message: "This inventory item is invalid." };
  if (!productName || !listingTitle) return { status: "error", message: "Product name and listing title are required." };
  if (unitCostCents === null || askingPriceCents === null) return { status: "error", message: "Enter valid non-negative cost and asking prices." };
  if (!["in_stock", "temporarily_out", "restock_soon", "restock_asap", "do_not_restock"].includes(restockStatus)) return { status: "error", message: "Choose a valid restock status." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_inventory_item", {
    target_unit_id: unitId,
    product_name: productName,
    product_brand: text(formData, "brand"),
    product_category: text(formData, "category"),
    product_size: text(formData, "size"),
    product_color: text(formData, "color"),
    product_condition: text(formData, "condition"),
    product_description: text(formData, "description"),
    product_sell_multiple: formData.get("sellMultiple") === "on",
    unit_cost_cents: unitCostCents,
    unit_storage_location: text(formData, "storageLocation"),
    listing_title: listingTitle,
    listing_description: text(formData, "listingDescription"),
    listing_asking_price_cents: askingPriceCents,
  });
  if (error) return { status: "error", message: error.message };
  const { error: restockError } = await supabase.rpc("set_product_restock_status", { target_unit_id: unitId, new_restock_status: restockStatus });
  if (restockError) return { status: "error", message: restockError.message };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${unitId}`);
  return { status: "success", message: "Changes saved." };
}
