import type { Metadata } from "next";
import { InventoryBrowser } from "@/features/inventory/components/inventory-browser";
import { listInventory } from "@/features/inventory/data/inventory-repository";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await listInventory();
  return <InventoryBrowser items={items} />;
}
