"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MarketplacePlatform } from "@/features/sales/types";

export type RecordSaleState = { status: "idle" | "error"; message: string };

function parseMoney(formData: FormData, name: string, label: string, required = false) {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw && !required) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error(`${label} must be a valid dollar amount.`);
  const cents = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || (required && cents === 0)) throw new Error(`${label} must be greater than zero.`);
  return cents;
}

function parseQuantity(formData: FormData) {
  const raw = String(formData.get("quantity") ?? "1").trim();
  if (!/^\d+$/.test(raw)) throw new Error("Quantity must be a whole number.");
  const quantity = Number(raw);
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Quantity must be at least one.");
  return quantity;
}

export async function recordSaleAction(_previous: RecordSaleState, formData: FormData): Promise<RecordSaleState> {
  const unitId = String(formData.get("unitId") ?? "");
  const platform = String(formData.get("platform") ?? "") as MarketplacePlatform;
  const soldAtValue = String(formData.get("soldAt") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(unitId)) return { status: "error", message: "Choose an inventory item." };
  if (!(["facebook", "ebay", "other"] as MarketplacePlatform[]).includes(platform)) return { status: "error", message: "Choose a valid marketplace." };
  const soldAt = new Date(soldAtValue);
  if (!soldAtValue || Number.isNaN(soldAt.getTime())) return { status: "error", message: "Choose when the item sold." };
  let saleId = "";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("record_inventory_sale", {
      target_unit_id: unitId,
      sale_platform: platform,
      sale_price_cents: parseMoney(formData, "salePrice", "Sale price", true),
      platform_fee_cents: parseMoney(formData, "platformFee", "Platform fee"),
      payment_fee_cents: parseMoney(formData, "paymentFee", "Payment fee"),
      shipping_cost_cents: parseMoney(formData, "shippingCost", "Shipping cost"),
      other_cost_cents: parseMoney(formData, "otherCost", "Other cost"),
      sale_sold_at: soldAt.toISOString(),
      sale_quantity: parseQuantity(formData),
    });
    if (error || !data) return { status: "error", message: error?.message ?? "The sale could not be recorded." };
    saleId = data;
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "The sale could not be recorded." };
  }
  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${unitId}`);
  redirect(`/sales/${saleId}/moment?unitId=${unitId}`);
}
