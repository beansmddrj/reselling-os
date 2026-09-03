"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BulkQuantityControls({ unitId, availableCount }: { unitId: string; availableCount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function adjust(direction: 1 | -1) {
    const parsed = Number(amount);
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(parsed) || parsed < 1) {
      setError("Enter a whole number of at least 1.");
      return;
    }
    if (direction < 0 && parsed > availableCount) {
      setError(`Only ${availableCount} units are available to remove.`);
      return;
    }
    setPending(true);
    setError("");
    const { error: rpcError } = await createClient().rpc("adjust_bulk_inventory_quantity", {
      target_unit_id: unitId,
      quantity_delta: direction * parsed,
    });
    if (rpcError) setError(rpcError.message);
    else {
      setAmount("1");
      router.refresh();
    }
    setPending(false);
  }

  return <section className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/[.045] p-4">
    <p className="text-xs font-semibold uppercase tracking-[.15em] text-[var(--accent)]">Bulk quantity</p>
    <p className="mt-1 text-sm text-[var(--muted)]">Adjust real on-hand stock without creating duplicate listings. Removed units are recorded as a stock correction, never silently deleted.</p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block sm:w-40"><span className="text-sm font-semibold">Units</span><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#111319] px-3 text-base outline-none focus:border-[var(--accent)]"/></label><div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => void adjust(1)} className="min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-black disabled:opacity-50">{pending ? "Updating…" : "Add stock"}</button><button type="button" disabled={pending || availableCount === 0} onClick={() => void adjust(-1)} className="min-h-11 rounded-xl border border-red-300/30 px-4 text-sm font-bold text-red-200 disabled:opacity-50">Remove stock</button></div></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
  </section>;
}
