import "server-only";

import { getBusinessContext } from "@/features/team/data/business-context";
import { calculateProfitCents } from "@/features/sales/money";
import type { SaleCandidate, SaleLedgerItem, SalesOverview } from "@/features/sales/types";

export async function getSalesOverview(): Promise<SalesOverview> {
  const { supabase, ownerId } = await getBusinessContext();
  const [salesResult, unitsResult] = await Promise.all([
    supabase.from("sales").select("id, inventory_unit_id, platform, sale_price_cents, cogs_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sold_at").eq("owner_id", ownerId).order("sold_at", { ascending: false }),
    supabase.from("inventory_units").select("id, product_id, sku, status, acquisition_cost_cents").eq("owner_id", ownerId).order("created_at", { ascending: false }),
  ]);
  if (salesResult.error) throw new Error(`Sales could not be loaded: ${salesResult.error.message}`);
  if (unitsResult.error) throw new Error(`Inventory could not be loaded: ${unitsResult.error.message}`);

  const productIds = [...new Set(unitsResult.data.map((unit) => unit.product_id))];
  const [productsResult, listingsResult] = productIds.length ? await Promise.all([
    supabase.from("products").select("id, name").eq("owner_id", ownerId).in("id", productIds),
    supabase.from("listings").select("product_id, platform, asking_price_cents, created_at").eq("owner_id", ownerId).in("product_id", productIds).order("created_at", { ascending: false }),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (productsResult.error) throw new Error(`Products could not be loaded: ${productsResult.error.message}`);
  if (listingsResult.error) throw new Error(`Listings could not be loaded: ${listingsResult.error.message}`);

  const products = new Map(productsResult.data.map((product) => [product.id, product.name]));
  const units = new Map(unitsResult.data.map((unit) => [unit.id, unit]));
  const listings = new Map<string, (typeof listingsResult.data)[number]>();
  listingsResult.data.forEach((listing) => { if (!listings.has(listing.product_id)) listings.set(listing.product_id, listing); });

  const sales: SaleLedgerItem[] = salesResult.data.map((sale) => {
    const unit = units.get(sale.inventory_unit_id);
    const costs = {
      salePriceCents: sale.sale_price_cents, cogsCents: sale.cogs_cents,
      platformFeeCents: sale.platform_fee_cents, paymentFeeCents: sale.payment_fee_cents,
      shippingCostCents: sale.shipping_cost_cents, otherCostCents: sale.other_cost_cents,
    };
    return { id: sale.id, inventoryUnitId: sale.inventory_unit_id, productName: unit ? products.get(unit.product_id) ?? "Inventory item" : "Inventory item", sku: unit?.sku ?? "—", platform: sale.platform, ...costs, profitCents: calculateProfitCents(costs), soldAt: sale.sold_at };
  });
  const candidates: SaleCandidate[] = unitsResult.data.filter((unit) => unit.status !== "sold").map((unit) => {
    const listing = listings.get(unit.product_id);
    return { id: unit.id, name: products.get(unit.product_id) ?? "Inventory item", sku: unit.sku, status: unit.status, acquisitionCostCents: unit.acquisition_cost_cents, askingPriceCents: listing?.asking_price_cents ?? null, platform: listing?.platform ?? null };
  });
  const revenueCents = sales.reduce((sum, sale) => sum + sale.salePriceCents, 0);
  const profitCents = sales.reduce((sum, sale) => sum + sale.profitCents, 0);
  return {
    sales, candidates, revenueCents, profitCents,
    averageSaleCents: sales.length ? Math.round(revenueCents / sales.length) : 0,
    activeInventoryCount: unitsResult.data.filter((unit) => unit.status === "active").length,
    readyInventoryCount: unitsResult.data.filter((unit) => unit.status === "ready").length,
  };
}
