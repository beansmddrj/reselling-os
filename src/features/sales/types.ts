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
  sellMultiple: boolean;
};

export type SaleLedgerItem = {
  id: string;
  inventoryUnitId: string;
  productName: string;
  sku: string;
  platform: MarketplacePlatform;
  salePriceCents: number;
  cogsCents: number | null;
  platformFeeCents: number | null;
  paymentFeeCents: number | null;
  shippingCostCents: number | null;
  otherCostCents: number | null;
  profitCents: number | null;
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
  isOwner: boolean;
};
