import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { InventoryDetail, InventoryListItem } from "@/features/inventory/types";
import { getBusinessContext } from "@/features/team/data/business-context";

const PHOTO_BUCKET = "intake-photos";
const PHOTO_URL_LIFETIME_SECONDS = 60 * 60;

async function getOwnerClient() {
  const { supabase, businessId } = await getBusinessContext();
  return { supabase, businessId };
}

async function signPhotoPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  const entries = await Promise.all(paths.map(async (path) => {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, PHOTO_URL_LIFETIME_SECONDS);
    return [path, data?.signedUrl ?? null] as const;
  }));
  return new Map(entries);
}

export async function listInventory(): Promise<InventoryListItem[]> {
  const { supabase, businessId } = await getOwnerClient();
  const { data: units, error: unitError } = await supabase
    .from("inventory_units")
    .select("id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location, variant_size, is_stock_placeholder")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (unitError) throw new Error(`Inventory could not be loaded: ${unitError.message}`);
  if (!units.length) return [];

  const productIds = [...new Set(units.map((unit) => unit.product_id))];
  const [productsResult, listingsResult, photosResult, lotsResult] = await Promise.all([
    supabase.from("products").select("id, name, brand, category, condition, is_template, inventory_mode, has_variants, restock_status, archived_at").eq("business_id", businessId).in("id", productIds),
    supabase.from("listings").select("id, product_id, platform, status, asking_price_cents, created_at").eq("business_id", businessId).in("product_id", productIds).order("created_at", { ascending: false }),
    supabase.from("product_photos").select("id, product_id, storage_path, position").eq("business_id", businessId).in("product_id", productIds).eq("position", 0),
    supabase.from("inventory_lots").select("product_id, available_quantity, sold_quantity, variant_label").eq("business_id", businessId).in("product_id", productIds),
  ]);
  if (productsResult.error) throw new Error(`Products could not be loaded: ${productsResult.error.message}`);
  if (listingsResult.error) throw new Error(`Listings could not be loaded: ${listingsResult.error.message}`);
  if (photosResult.error) throw new Error(`Photos could not be loaded: ${photosResult.error.message}`);
  if (lotsResult.error) throw new Error(`Bulk inventory could not be loaded: ${lotsResult.error.message}`);

  const signedPhotos = await signPhotoPaths(supabase, photosResult.data.map((photo) => photo.storage_path));
  const products = new Map(productsResult.data.map((product) => [product.id, product]));
  const leadPhotos = new Map(photosResult.data.map((photo) => [photo.product_id, signedPhotos.get(photo.storage_path) ?? null]));
  const listings = new Map<string, (typeof listingsResult.data)[number]>();
  const bulkQuantities = new Map<string, { available: number; sold: number }>();
  lotsResult.data.forEach((lot) => {
    const current = bulkQuantities.get(lot.product_id) ?? { available: 0, sold: 0 };
    bulkQuantities.set(lot.product_id, { available: current.available + lot.available_quantity, sold: current.sold + lot.sold_quantity });
  });
  listingsResult.data.forEach((listing) => {
    if (!listings.has(listing.product_id)) listings.set(listing.product_id, listing);
  });

  const groupedProducts = new Set<string>();
  return units.flatMap((unit) => {
    const product = products.get(unit.product_id);
    if (!product) return [];
    const productUnits = units.filter((candidate) => candidate.product_id === unit.product_id);
    if (product.is_template) {
      if (groupedProducts.has(product.id)) return [];
      groupedProducts.add(product.id);
      unit = productUnits.find((candidate) => candidate.status !== "sold" && !candidate.is_stock_placeholder) ?? productUnits[0];
    }
    const listing = listings.get(unit.product_id);
    const inventoryMode = product.inventory_mode === "bulk" ? "bulk" as const : product.is_template ? "repeat" as const : "unique" as const;
    const bulkQuantity = bulkQuantities.get(product.id) ?? { available: 0, sold: 0 };
    const cardStatus = product.inventory_mode === "bulk"
      ? unit.status
      : product.is_template && !productUnits.some((candidate) => candidate.status !== "sold" && !candidate.is_stock_placeholder)
      ? (listing?.status === "active" ? "active" : "ready")
      : unit.status;
    return [{
      id: unit.id,
      productId: unit.product_id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      condition: product.condition,
      sku: unit.sku,
      status: unit.status,
      displayStatus: cardStatus,
      acquisitionCostCents: unit.acquisition_cost_cents,
      askingPriceCents: listing?.asking_price_cents ?? null,
      storageLocation: unit.storage_location,
      acquiredAt: unit.acquired_at,
      leadPhotoUrl: leadPhotos.get(unit.product_id) ?? null,
      listingPlatform: listing?.platform ?? null,
      sellMultiple: product.is_template,
      inventoryMode,
      restockStatus: product.restock_status as InventoryListItem["restockStatus"],
      archived: product.archived_at !== null,
      availableCount: inventoryMode === "bulk" ? bulkQuantity.available : productUnits.filter((candidate) => candidate.status !== "sold" && !candidate.is_stock_placeholder).length,
      soldCount: inventoryMode === "bulk" ? bulkQuantity.sold : productUnits.filter((candidate) => candidate.status === "sold").length,
    }];
  });
}

export async function getInventoryDetail(unitId: string): Promise<InventoryDetail | null> {
  const { supabase, businessId } = await getOwnerClient();
  const { data: unit, error: unitError } = await supabase
    .from("inventory_units")
    .select("id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location, variant_size, is_stock_placeholder")
    .eq("business_id", businessId)
    .eq("id", unitId)
    .maybeSingle();
  if (unitError) throw new Error(`Inventory item could not be loaded: ${unitError.message}`);
  if (!unit) return null;

  const [productResult, listingsResult, photosResult, siblingUnitsResult, lotsResult] = await Promise.all([
    supabase.from("products").select("id, name, brand, category, size, color, condition, description, is_template, inventory_mode, has_variants, restock_status, archived_at").eq("business_id", businessId).eq("id", unit.product_id).single(),
    supabase.from("listings").select("id, status, platform, title, description, asking_price_cents, external_url, created_at").eq("business_id", businessId).eq("product_id", unit.product_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("product_photos").select("id, storage_path, position").eq("business_id", businessId).eq("product_id", unit.product_id).order("position"),
    supabase.from("inventory_units").select("id, sku, status, variant_size, is_stock_placeholder").eq("business_id", businessId).eq("product_id", unit.product_id).order("created_at", { ascending: false }),
    supabase.from("inventory_lots").select("available_quantity, sold_quantity, variant_label").eq("business_id", businessId).eq("product_id", unit.product_id),
  ]);
  if (productResult.error) throw new Error(`Product could not be loaded: ${productResult.error.message}`);
  if (listingsResult.error) throw new Error(`Listing could not be loaded: ${listingsResult.error.message}`);
  if (photosResult.error) throw new Error(`Photos could not be loaded: ${photosResult.error.message}`);
  if (siblingUnitsResult.error) throw new Error(`Related inventory units could not be loaded: ${siblingUnitsResult.error.message}`);
  if (lotsResult.error) throw new Error(`Bulk inventory could not be loaded: ${lotsResult.error.message}`);

  const signedPhotos = await signPhotoPaths(supabase, photosResult.data.map((photo) => photo.storage_path));
  const listing = listingsResult.data;
  const inventoryMode = productResult.data.inventory_mode === "bulk" ? "bulk" as const : productResult.data.is_template ? "repeat" as const : "unique" as const;
  const bulkAvailable = lotsResult.data.reduce((sum, lot) => sum + lot.available_quantity, 0);
  const bulkSold = lotsResult.data.reduce((sum, lot) => sum + lot.sold_quantity, 0);
  const bulkVariantBreakdown = [...lotsResult.data.reduce((variants, lot) => {
    if (!lot.variant_label) return variants;
    const current = variants.get(lot.variant_label) ?? { label: lot.variant_label, available: 0, sold: 0 };
    current.available += lot.available_quantity;
    current.sold += lot.sold_quantity;
    variants.set(lot.variant_label, current);
    return variants;
  }, new Map<string, { label: string; available: number; sold: number }>()).values()].sort((left, right) => left.label.localeCompare(right.label));
  const availableSizeBreakdown = [...siblingUnitsResult.data
    .filter((candidate) => candidate.status !== "sold" && !candidate.is_stock_placeholder)
    .reduce((sizes, candidate) => {
      const label = candidate.variant_size?.trim() || "N/A";
      sizes.set(label, (sizes.get(label) ?? 0) + 1);
      return sizes;
    }, new Map<string, number>())]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => left.label === "N/A" ? 1 : right.label === "N/A" ? -1 : left.label.localeCompare(right.label));
  return {
    id: unit.id,
    productId: unit.product_id,
    name: productResult.data.name,
    brand: productResult.data.brand,
    category: productResult.data.category,
    size: productResult.data.size,
    color: productResult.data.color,
    condition: productResult.data.condition,
    description: productResult.data.description,
    sellMultiple: productResult.data.is_template,
    inventoryMode,
    restockStatus: productResult.data.restock_status as InventoryDetail["restockStatus"],
    archived: productResult.data.archived_at !== null,
    availableCount: inventoryMode === "bulk" ? bulkAvailable : siblingUnitsResult.data.filter((candidate) => candidate.status !== "sold" && !candidate.is_stock_placeholder).length,
    soldCount: inventoryMode === "bulk" ? bulkSold : siblingUnitsResult.data.filter((candidate) => candidate.status === "sold").length,
    nextRepeatUnitId: inventoryMode === "bulk" ? null : siblingUnitsResult.data.find((candidate) => candidate.status !== "sold" && !candidate.is_stock_placeholder)?.id ?? null,
    unitSize: unit.variant_size,
    availableSizeBreakdown,
    unsetSizeUnits: siblingUnitsResult.data.filter((candidate) => candidate.status !== "sold" && !candidate.is_stock_placeholder && !candidate.variant_size?.trim()).map((candidate) => ({ id: candidate.id, sku: candidate.sku })),
    bulkVariantBreakdown,
    sku: unit.sku,
    status: unit.status,
    displayStatus: unit.status,
    acquisitionCostCents: unit.acquisition_cost_cents,
    askingPriceCents: listing?.asking_price_cents ?? null,
    storageLocation: unit.storage_location,
    acquiredAt: unit.acquired_at,
    leadPhotoUrl: photosResult.data[0] ? signedPhotos.get(photosResult.data[0].storage_path) ?? null : null,
    listingPlatform: listing?.platform ?? null,
    photos: photosResult.data.flatMap((photo) => {
      const url = signedPhotos.get(photo.storage_path);
      return url ? [{ id: photo.id, position: photo.position, url }] : [];
    }),
    listing: listing ? {
      id: listing.id,
      status: listing.status,
      platform: listing.platform,
      title: listing.title,
      description: listing.description,
      askingPriceCents: listing.asking_price_cents,
      externalUrl: listing.external_url,
    } : null,
  };
}
