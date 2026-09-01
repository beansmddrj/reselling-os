"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { updateInventoryItemAction, type InventoryEditState } from "@/features/inventory/actions/update-inventory-item";
import type { InventoryDetail } from "@/features/inventory/types";

function Field({ label, name, defaultValue, required, ...props }: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">{label}{required && <span className="text-[var(--accent)]"> *</span>}</span><input {...props} name={name} defaultValue={defaultValue ?? ""} required={required} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base outline-none transition placeholder:text-white/25 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]"/></label>;
}

export function InventoryEditForm({ item }: { item: InventoryDetail }) {
  const router = useRouter();
  const initialState: InventoryEditState = { status: "idle", message: "" };
  const [state, action, pending] = useActionState(updateInventoryItemAction, initialState);

  useEffect(() => {
    if (state.status !== "success") return;
    router.push(`/inventory/${item.id}`);
    router.refresh();
  }, [state.status, item.id, router]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="unitId" value={item.id}/>
      <section className="surface rounded-[2rem] p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Product</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Product name" name="name" defaultValue={item.name} required/></div><Field label="Brand" name="brand" defaultValue={item.brand}/><Field label="Category" name="category" defaultValue={item.category}/><Field label="Size / model" name="size" defaultValue={item.size}/><Field label="Color" name="color" defaultValue={item.color}/><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Condition</span><select name="condition" defaultValue={item.condition ?? ""} className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#111319] px-4 text-base outline-none focus:border-[var(--accent)]"><option value="">Choose condition</option><option>New</option><option>Like new</option><option>Good</option><option>Fair</option><option>For parts</option></select></label><div/><label className="block sm:col-span-2"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Product notes</span><textarea name="description" defaultValue={item.description ?? ""} rows={5} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base leading-6 outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]"/></label><label className="flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2"><input type="checkbox" name="sellMultiple" defaultChecked={item.sellMultiple} className="mt-1 size-5 accent-[var(--accent)]"/><span><span className="block text-sm font-semibold">Sell multiple</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Keep this product and listing active after each sale. Reselling OS automatically creates the next unit with the same cost and storage location.</span></span></label></div></section>
      <section className="surface rounded-[2rem] p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Physical unit</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Item cost" name="acquisitionCost" defaultValue={(item.acquisitionCostCents / 100).toFixed(2)} required type="number" inputMode="decimal" min="0" step="0.01"/><Field label="Storage location" name="storageLocation" defaultValue={item.storageLocation}/></div><p className="mt-4 text-xs text-[var(--muted)]">SKU {item.sku} and workflow status are managed separately and cannot be edited here.</p></section>
      <section className="surface rounded-[2rem] p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Listing draft</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Listing title" name="listingTitle" defaultValue={item.listing?.title ?? item.name} required/></div><Field label="Asking price" name="askingPrice" defaultValue={((item.listing?.askingPriceCents ?? item.askingPriceCents ?? 0) / 100).toFixed(2)} required type="number" inputMode="decimal" min="0" step="0.01"/><div/><label className="block sm:col-span-2"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Listing description</span><textarea name="listingDescription" defaultValue={item.listing?.description ?? ""} rows={6} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base leading-6 outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]"/></label></div></section>
      {state.status === "error" && <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{state.message}</div>}
      <div className="sticky bottom-[max(.75rem,env(safe-area-inset-bottom))] z-20 flex gap-3 rounded-2xl border border-white/10 bg-[var(--panel)]/95 p-3 shadow-2xl backdrop-blur-xl"><Link href={`/inventory/${item.id}`} className="grid min-h-12 flex-1 place-items-center rounded-xl border border-white/10 text-sm font-semibold">Cancel</Link><button type="submit" disabled={pending} className="min-h-12 flex-[1.4] rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-black disabled:cursor-wait disabled:opacity-60">{pending ? "Saving…" : "Save changes"}</button></div>
    </form>
  );
}
