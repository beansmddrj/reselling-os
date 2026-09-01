import type { Database } from "@/types/database";

export type InventoryStatus = Database["public"]["Enums"]["inventory_status"];
export type RestockStatus = "in_stock" | "temporarily_out" | "restock_soon" | "restock_asap" | "do_not_restock";

export type InventoryListItem = {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  category: string | null;
  condition: string | null;
  sku: string;
  status: InventoryStatus;
  acquisitionCostCents: number;
  askingPriceCents: number | null;
  storageLocation: string | null;
  acquiredAt: string;
  leadPhotoUrl: string | null;
  listingPlatform: string | null;
  sellMultiple: boolean;
  restockStatus: RestockStatus;
  archived: boolean;
  availableCount: number;
  soldCount: number;
};

export type InventoryDetail = InventoryListItem & {
  nextRepeatUnitId: string | null;
  unitSize: string | null;
  availableSizeBreakdown: { label: string; count: number }[];
  size: string | null;
  color: string | null;
  description: string | null;
  photos: { id: string; position: number; url: string }[];
  listing: {
    id: string;
    status: Database["public"]["Enums"]["listing_status"];
    platform: Database["public"]["Enums"]["marketplace_platform"];
    title: string;
    description: string | null;
    askingPriceCents: number;
    externalUrl: string | null;
  } | null;
};
