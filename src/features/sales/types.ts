import type { Database } from "@/types/database";

export type MarketplacePlatform = Database["public"]["Enums"]["marketplace_platform"];

export type SaleCandidate = {
  id: string;
  name: string;
  sku: string;
  status: Database["public"]["Enums"]["inventory_status"];
  acquisitionCostCents: number;
  askingPriceCents: number | null;
  platform: MarketplacePlatform | null;
};

export type SaleLedgerItem = {
  id: string;
  inventoryUnitId: string;
  productName: string;
  sku: string;
  platform: MarketplacePlatform;
  salePriceCents: number;
  cogsCents: number;
  platformFeeCents: number;
  paymentFeeCents: number;
  shippingCostCents: number;
  otherCostCents: number;
  profitCents: number;
  soldAt: string;
};

export type SalesOverview = {
  sales: SaleLedgerItem[];
  candidates: SaleCandidate[];
  revenueCents: number;
  profitCents: number;
  averageSaleCents: number;
  activeInventoryCount: number;
  readyInventoryCount: number;
};
