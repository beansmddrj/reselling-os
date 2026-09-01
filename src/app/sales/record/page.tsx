import type { Metadata } from "next";
import Link from "next/link";
import { RecordSaleForm } from "@/features/sales/components/record-sale-form";
import { getSalesOverview } from "@/features/sales/data/sales-repository";

export const metadata: Metadata = { title: "Record sale" };
export const dynamic = "force-dynamic";

export default async function RecordSalePage({ searchParams }: { searchParams: Promise<{ unitId?: string }> }) {
  const [{ unitId }, overview] = await Promise.all([searchParams, getSalesOverview()]);
  const localNow = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).replace(" ", "T");
  return <div className="mx-auto max-w-3xl space-y-4"><Link href="/sales" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] hover:text-white">← Back to sales</Link><RecordSaleForm candidates={overview.candidates} initialUnitId={unitId} soldAtDefault={localNow}/></div>;
}
