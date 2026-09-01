import "server-only";

import { getBusinessContext } from "@/features/team/data/business-context";
import { calculateProfitCents } from "@/features/sales/money";
import type { BusinessExpense, SaleCandidate, SaleLedgerItem, SalesOverview } from "@/features/sales/types";

export async function getSalesOverview(): Promise<SalesOverview> {
  const { supabase, ownerId, role } = await getBusinessContext();
  const isOwner = role === "owner";
  const [salesResult, unitsResult, expensesResult] = await Promise.all([
    isOwner
      ? supabase.rpc("get_owner_sales_financials", { target_owner_id: ownerId })
      : supabase.from("sales").select("id, inventory_unit_id, platform, sale_price_cents, sold_at").eq("owner_id", ownerId).order("sold_at", { ascending: false }),
    supabase.from("inventory_units").select("id, product_id, sku, status, acquisition_cost_cents, is_stock_placeholder").eq("owner_id", ownerId).order("created_at", { ascending: false }),
    isOwner ? supabase.from("business_expenses").select("id, category, amount_cents, description, occurred_on").eq("owner_id", ownerId).order("occurred_on", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (salesResult.error) throw new Error(`Sales could not be loaded: ${salesResult.error.message}`);
  if (unitsResult.error) throw new Error(`Inventory could not be loaded: ${unitsResult.error.message}`);
  if (expensesResult.error) throw new Error(`Expenses could not be loaded: ${expensesResult.error.message}`);

  const productIds = [...new Set(unitsResult.data.map((unit) => unit.product_id))];
  const saleIds = salesResult.data.map((sale) => sale.id);
  const [productsResult, listingsResult, momentsResult] = productIds.length ? await Promise.all([
    supabase.from("products").select("id, name, is_template, restock_status, archived_at").eq("owner_id", ownerId).in("id", productIds),
    supabase.from("listings").select("product_id, platform, asking_price_cents, created_at").eq("owner_id", ownerId).in("product_id", productIds).order("created_at", { ascending: false }),
    saleIds.length ? supabase.from("sale_moments").select("sale_id").eq("owner_id", ownerId).in("sale_id", saleIds) : Promise.resolve({ data: [], error: null }),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (productsResult.error) throw new Error(`Products could not be loaded: ${productsResult.error.message}`);
  if (listingsResult.error) throw new Error(`Listings could not be loaded: ${listingsResult.error.message}`);
  if (momentsResult.error) throw new Error(`Sold Moments could not be loaded: ${momentsResult.error.message}`);

  const products = new Map(productsResult.data.map((product) => [product.id, product]));
  const units = new Map(unitsResult.data.map((unit) => [unit.id, unit]));
  const listings = new Map<string, (typeof listingsResult.data)[number]>();
  listingsResult.data.forEach((listing) => { if (!listings.has(listing.product_id)) listings.set(listing.product_id, listing); });
  const momentCounts = new Map<string, number>();
  momentsResult.data.forEach((moment) => momentCounts.set(moment.sale_id, (momentCounts.get(moment.sale_id) ?? 0) + 1));

  const sales: SaleLedgerItem[] = salesResult.data.map((sale) => {
    const unit = units.get(sale.inventory_unit_id);
    const privateCosts = "cogs_cents" in sale ? {
      cogsCents: sale.cogs_cents, platformFeeCents: sale.platform_fee_cents,
      paymentFeeCents: sale.payment_fee_cents, shippingCostCents: sale.shipping_cost_cents,
      otherCostCents: sale.other_cost_cents,
    } : { cogsCents: null, platformFeeCents: null, paymentFeeCents: null, shippingCostCents: null, otherCostCents: null };
    const profitCents = privateCosts.cogsCents === null ? null : calculateProfitCents({ salePriceCents: sale.sale_price_cents, cogsCents: privateCosts.cogsCents, platformFeeCents: privateCosts.platformFeeCents ?? 0, paymentFeeCents: privateCosts.paymentFeeCents ?? 0, shippingCostCents: privateCosts.shippingCostCents ?? 0, otherCostCents: privateCosts.otherCostCents ?? 0 });
    return { id: sale.id, inventoryUnitId: sale.inventory_unit_id, productName: unit ? products.get(unit.product_id)?.name ?? "Inventory item" : "Inventory item", sku: unit?.sku ?? "—", platform: sale.platform, salePriceCents: sale.sale_price_cents, ...privateCosts, profitCents, soldAt: sale.sold_at, soldMomentCount: momentCounts.get(sale.id) ?? 0 };
  });
  const candidates: SaleCandidate[] = unitsResult.data.filter((unit) => {
    if (unit.status === "sold" || unit.is_stock_placeholder) return false;
    const product = products.get(unit.product_id);
    if (product?.archived_at) return false;
    return !product?.is_template || !["temporarily_out", "restock_soon", "restock_asap"].includes(product.restock_status);
  }).map((unit) => {
    const listing = listings.get(unit.product_id);
    const product = products.get(unit.product_id);
    return { id: unit.id, name: product?.name ?? "Inventory item", sku: unit.sku, status: unit.status, acquisitionCostCents: unit.acquisition_cost_cents, askingPriceCents: listing?.asking_price_cents ?? null, platform: listing?.platform ?? null, sellMultiple: product?.is_template ?? false };
  });
  const revenueCents = sales.reduce((sum, sale) => sum + sale.salePriceCents, 0);
  const expenses: BusinessExpense[] = expensesResult.data.map((expense) => ({ id: expense.id, category: expense.category as BusinessExpense["category"], amountCents: expense.amount_cents, description: expense.description, occurredOn: expense.occurred_on }));
  const operatingExpenseCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const profitCents = sales.reduce((sum, sale) => sum + (sale.profitCents ?? 0), 0) - operatingExpenseCents;
  return {
    sales, candidates, revenueCents, profitCents,
    averageSaleCents: sales.length ? Math.round(revenueCents / sales.length) : 0,
    activeInventoryCount: unitsResult.data.filter((unit) => unit.status === "active" && !products.get(unit.product_id)?.archived_at).length,
    readyInventoryCount: unitsResult.data.filter((unit) => unit.status === "ready" && !products.get(unit.product_id)?.archived_at).length,
    isOwner,
    expenses,
    operatingExpenseCents,
  };
}
