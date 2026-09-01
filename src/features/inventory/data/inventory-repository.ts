import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { InventoryDetail, InventoryListItem } from "@/features/inventory/types";

const PHOTO_BUCKET = "intake-photos";
const PHOTO_URL_LIFETIME_SECONDS = 60 * 60;

async function getOwnerClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const ownerId = data?.claims?.sub;
  if (error || !ownerId) throw new Error("Your session could not be verified. Sign in again.");
  return { supabase, ownerId };
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
  const { supabase, ownerId } = await getOwnerClient();
  const { data: units, error: unitError } = await supabase
    .from("inventory_units")
    .select("id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (unitError) throw new Error(`Inventory could not be loaded: ${unitError.message}`);
  if (!units.length) return [];

  const productIds = [...new Set(units.map((unit) => unit.product_id))];
  const [productsResult, listingsResult, photosResult] = await Promise.all([
    supabase.from("products").select("id, name, brand, category, condition").eq("owner_id", ownerId).in("id", productIds),
    supabase.from("listings").select("id, product_id, platform, asking_price_cents, created_at").eq("owner_id", ownerId).in("product_id", productIds).order("created_at", { ascending: false }),
    supabase.from("product_photos").select("id, product_id, storage_path, position").eq("owner_id", ownerId).in("product_id", productIds).eq("position", 0),
  ]);
  if (productsResult.error) throw new Error(`Products could not be loaded: ${productsResult.error.message}`);
  if (listingsResult.error) throw new Error(`Listings could not be loaded: ${listingsResult.error.message}`);
  if (photosResult.error) throw new Error(`Photos could not be loaded: ${photosResult.error.message}`);

  const signedPhotos = await signPhotoPaths(supabase, photosResult.data.map((photo) => photo.storage_path));
  const products = new Map(productsResult.data.map((product) => [product.id, product]));
  const leadPhotos = new Map(photosResult.data.map((photo) => [photo.product_id, signedPhotos.get(photo.storage_path) ?? null]));
  const listings = new Map<string, (typeof listingsResult.data)[number]>();
  listingsResult.data.forEach((listing) => {
    if (!listings.has(listing.product_id)) listings.set(listing.product_id, listing);
  });

  return units.flatMap((unit) => {
    const product = products.get(unit.product_id);
    if (!product) return [];
    const listing = listings.get(unit.product_id);
    return [{
      id: unit.id,
      productId: unit.product_id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      condition: product.condition,
      sku: unit.sku,
      status: unit.status,
      acquisitionCostCents: unit.acquisition_cost_cents,
      askingPriceCents: listing?.asking_price_cents ?? null,
      storageLocation: unit.storage_location,
      acquiredAt: unit.acquired_at,
      leadPhotoUrl: leadPhotos.get(unit.product_id) ?? null,
      listingPlatform: listing?.platform ?? null,
    }];
  });
}

export async function getInventoryDetail(unitId: string): Promise<InventoryDetail | null> {
  const { supabase, ownerId } = await getOwnerClient();
  const { data: unit, error: unitError } = await supabase
    .from("inventory_units")
    .select("id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location")
    .eq("owner_id", ownerId)
    .eq("id", unitId)
    .maybeSingle();
  if (unitError) throw new Error(`Inventory item could not be loaded: ${unitError.message}`);
  if (!unit) return null;

  const [productResult, listingsResult, photosResult] = await Promise.all([
    supabase.from("products").select("id, name, brand, category, size, color, condition, description").eq("owner_id", ownerId).eq("id", unit.product_id).single(),
    supabase.from("listings").select("id, status, platform, title, description, asking_price_cents, created_at").eq("owner_id", ownerId).eq("product_id", unit.product_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("product_photos").select("id, storage_path, position").eq("owner_id", ownerId).eq("product_id", unit.product_id).order("position"),
  ]);
  if (productResult.error) throw new Error(`Product could not be loaded: ${productResult.error.message}`);
  if (listingsResult.error) throw new Error(`Listing could not be loaded: ${listingsResult.error.message}`);
  if (photosResult.error) throw new Error(`Photos could not be loaded: ${photosResult.error.message}`);

  const signedPhotos = await signPhotoPaths(supabase, photosResult.data.map((photo) => photo.storage_path));
  const listing = listingsResult.data;
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
    sku: unit.sku,
    status: unit.status,
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
    } : null,
  };
}
