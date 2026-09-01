import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InventoryEditForm } from "@/features/inventory/components/inventory-edit-form";
import { getInventoryDetail } from "@/features/inventory/data/inventory-repository";

export const metadata: Metadata = { title: "Edit inventory item" };
export const dynamic = "force-dynamic";

export default async function EditInventoryPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const item = await getInventoryDetail(unitId);
  if (!item) notFound();
  return <div className="mx-auto max-w-3xl"><Link href={`/inventory/${item.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-[var(--muted)] hover:text-white">← Cancel editing</Link><div className="mb-6 mt-2"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Edit inventory</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{item.name}</h1><p className="mt-2 text-sm text-[var(--muted)]">Update the product, this physical unit, and its current listing draft.</p></div><InventoryEditForm item={item}/></div>;
}
