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
  inventoryMode: "unique" | "repeat" | "bulk";
  availableQuantity: number;
};

export type SaleLedgerItem = {
  id: string;
  inventoryUnitId: string;
  productName: string;
  sku: string;
  platform: MarketplacePlatform;
  salePriceCents: number;
  quantity: number;
  cogsCents: number | null;
  platformFeeCents: number | null;
  paymentFeeCents: number | null;
  shippingCostCents: number | null;
  otherCostCents: number | null;
  profitCents: number | null;
  soldMomentCount: number;
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
  expenses: BusinessExpense[];
  operatingExpenseCents: number;
};

export type BusinessExpense = {
  id: string;
  category: "supplies" | "travel" | "subscription" | "shipping" | "taxes" | "personal_draw" | "historical_adjustment" | "other";
  amountCents: number;
  description: string;
  occurredOn: string;
};
