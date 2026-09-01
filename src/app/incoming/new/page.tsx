import Link from "next/link";
import { redirect } from "next/navigation";
import { NewShipmentForm } from "@/features/incoming/components/new-shipment-form";
import { getBusinessContext } from "@/features/team/data/business-context";

export default async function NewIncomingShipmentPage() {
  const { role } = await getBusinessContext(); if (role !== "owner") redirect("/incoming");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
  return <div className="mx-auto max-w-4xl space-y-4"><Link href="/incoming" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] hover:text-white">← Back to incoming</Link><NewShipmentForm today={today}/></div>;
}
