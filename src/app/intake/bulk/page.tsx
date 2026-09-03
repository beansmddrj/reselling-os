import type { Metadata } from "next";
import { BulkIntakeForm } from "@/features/inventory/components/bulk-intake-form";

export const metadata: Metadata = { title: "Bulk intake" };

export default async function BulkIntakePage({ searchParams }: { searchParams: Promise<{ shipment?: string; unitCost?: string }> }) {
  const query = await searchParams;
  return <BulkIntakeForm sourceShipmentId={query.shipment} defaultCost={query.unitCost} />;
}
