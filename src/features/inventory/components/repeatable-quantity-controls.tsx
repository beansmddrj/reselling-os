"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RepeatableQuantityControls({ unitId, availableCount }: { unitId: string; availableCount: number }) {
  const router = useRouter();
  const [count, setCount] = useState(availableCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function adjust(delta: -1 | 1) {
    if (pending || (delta === -1 && count === 0)) return;
    setPending(true); setError("");
    const { data, error: rpcError } = await createClient().rpc("adjust_repeatable_inventory_quantity", { target_unit_id: unitId, quantity_delta: delta });
    if (rpcError) setError(rpcError.message); else { setCount(data); router.refresh(); }
    setPending(false);
  }
  return <section className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/[.045] p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[var(--accent)]">Repeatable stock</p><p className="mt-1 text-sm text-[var(--muted)]">Adjust real units without creating a new listing.</p></div><div className="flex items-center gap-2"><button type="button" aria-label="Remove one available unit" disabled={pending || count === 0} onClick={() => void adjust(-1)} className="grid size-10 place-items-center rounded-xl border border-white/10 text-lg font-bold disabled:opacity-35">−</button><output aria-live="polite" className="grid min-w-12 place-items-center text-xl font-bold">{count}</output><button type="button" aria-label="Add one available unit" disabled={pending} onClick={() => void adjust(1)} className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-lg font-bold text-black disabled:opacity-50">+</button></div></div>{error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}</section>;
}
