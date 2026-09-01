import Link from "next/link";

export default function InventoryNotFound() {
  return <div className="surface mx-auto max-w-xl rounded-[2rem] p-7 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-2xl">▦</div><h1 className="mt-5 text-2xl font-semibold">Inventory item not found</h1><p className="mt-2 text-sm text-[var(--muted)]">It may have been removed, or it belongs to another account.</p><Link href="/inventory" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black">Back to inventory</Link></div>;
}
