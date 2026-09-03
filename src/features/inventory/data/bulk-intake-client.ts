import { createClient } from "@/lib/supabase/client";

export type BulkIntakeInput = {
  name: string;
  brand: string;
  category: string;
  description: string;
  condition: string;
  color: string;
  askingPriceCents: number;
  unitCostCents: number;
  storageLocation: string;
  quantity: number;
  packageLabel: string;
  packageQuantity: number | null;
  unitsPerPackage: number | null;
  notes: string;
  variants: { label: string; quantity: number }[];
  sourceShipmentId?: string | null;
};

export async function createBulkInventory(input: BulkIntakeInput) {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in before adding bulk inventory.");

  const { data: memberships, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id, role, joined_at")
    .eq("user_id", auth.user.id)
    .order("joined_at");
  if (membershipError || !memberships?.length) throw new Error("Your business workspace could not be loaded.");
  const membership = memberships.find((item) => item.role === "member") ?? memberships[0];

  const { data, error } = await supabase.rpc("create_bulk_inventory_product", {
    target_business_id: membership.business_id,
    product_name: input.name,
    product_brand: input.brand,
    product_category: input.category,
    product_description: input.description,
    product_condition: input.condition,
    product_color: input.color,
    product_asking_price_cents: input.askingPriceCents,
    product_unit_cost_cents: input.unitCostCents,
    product_storage_location: input.storageLocation,
    initial_quantity: input.quantity,
    initial_package_label: input.packageLabel || null,
    initial_package_quantity: input.packageQuantity,
    initial_units_per_package: input.unitsPerPackage,
    initial_notes: input.notes || null,
    initial_source_shipment_id: input.sourceShipmentId ?? null,
    initial_variants: input.variants,
  });
  if (error || !data?.[0]) throw new Error(error?.message ?? "Bulk inventory could not be created.");
  return data[0];
}
