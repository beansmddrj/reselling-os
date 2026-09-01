import type { Metadata } from "next";
import { SmartIntake } from "@/features/intake/components/smart-intake";

export const metadata: Metadata = { title: "Smart Intake" };

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ shipment?: string; unitCost?: string }> }) {
  const query = await searchParams;
  return <SmartIntake sourceShipmentId={query.shipment} defaultCost={query.unitCost} />;
}
