"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RepeatableQuantityControls({ unitId, availableCount, sizeBreakdown }: { unitId: string; availableCount: number; sizeBreakdown: { label: string; count: number }[] }) {
  const router = useRouter();
  const [count, setCount] = useState(availableCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [size, setSize] = useState("");
  async function adjust(delta: -1 | 1, newUnitSize?: string | null) {
    if (pending || (delta === -1 && count === 0)) return;
    setPending(true); setError("");
    const { data, error: rpcError } = await createClient().rpc("adjust_repeatable_inventory_quantity", { target_unit_id: unitId, quantity_delta: delta, ...(delta === 1 ? { new_unit_size: newUnitSize ?? null } : {}) });
    if (rpcError) setError(rpcError.message); else { setCount(data); setAddOpen(false); setSize(""); router.refresh(); }
    setPending(false);
  }
  return <section className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/[.045] p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[var(--accent)]">Repeatable stock</p><p className="mt-1 text-sm text-[var(--muted)]">Add real units without creating a new listing.</p></div><div className="flex items-center gap-2"><button type="button" aria-label="Remove one available unit" disabled={pending || count === 0} onClick={() => void adjust(-1)} className="grid size-10 place-items-center rounded-xl border border-white/10 text-lg font-bold disabled:opacity-35">−</button><output aria-live="polite" className="grid min-w-12 place-items-center text-xl font-bold">{count}</output><button type="button" aria-label="Add one available unit" disabled={pending} onClick={() => { setError(""); setAddOpen(true); }} className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-lg font-bold text-black disabled:opacity-50">+</button></div></div>{sizeBreakdown.length > 0 && <p className="mt-3 text-xs leading-5 text-white/70">Available by size: {sizeBreakdown.map((entry) => `${entry.label} × ${entry.count}`).join(" · ")}</p>}{addOpen && <form onSubmit={(event) => { event.preventDefault(); void adjust(1, size); }} className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><label className="block text-sm font-semibold">Size for this unit <span className="font-normal text-[var(--muted)]">(optional)</span><input autoFocus value={size} onChange={(event) => setSize(event.target.value)} maxLength={80} placeholder="Example: M, 8.5, 6–12" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#111319] px-4 text-base outline-none focus:border-[var(--accent)]"/></label><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Leave it blank or choose Skip to save this unit as N/A.</p><div className="mt-4 flex flex-wrap gap-2"><button disabled={pending} className="min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-black disabled:opacity-50">{pending ? "Adding…" : "Add with size"}</button><button type="button" disabled={pending} onClick={() => void adjust(1, null)} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold disabled:opacity-50">Skip — set N/A</button><button type="button" disabled={pending} onClick={() => { setAddOpen(false); setSize(""); }} className="min-h-11 rounded-xl px-3 text-sm text-[var(--muted)]">Cancel</button></div></form>}{error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}</section>;
}
