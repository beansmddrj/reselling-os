"use client";

import { useActionState, useMemo, useState } from "react";
import { recordSaleAction, type RecordSaleState } from "@/features/sales/actions/record-sale";
import { formatMoney } from "@/features/sales/money";
import type { MarketplacePlatform, SaleCandidate } from "@/features/sales/types";

const initialState: RecordSaleState = { status: "idle", message: "" };
const inputClass = "mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base text-white outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]";

export function RecordSaleForm({ candidates, initialUnitId, soldAtDefault }: { candidates: SaleCandidate[]; initialUnitId?: string; soldAtDefault: string }) {
  const initial = candidates.find((item) => item.id === initialUnitId) ?? candidates[0];
  const [unitId, setUnitId] = useState(initial?.id ?? "");
  const selected = useMemo(() => candidates.find((item) => item.id === unitId), [candidates, unitId]);
  const [platform, setPlatform] = useState<MarketplacePlatform>(selected?.platform ?? "facebook");
  const [salePrice, setSalePrice] = useState(initial?.askingPriceCents == null ? "" : (initial.askingPriceCents / 100).toFixed(2));
  const [state, action, pending] = useActionState(recordSaleAction, initialState);

  if (!candidates.length) return <div className="surface rounded-[2rem] p-6 text-center"><p className="font-semibold">No unsold inventory</p><p className="mt-2 text-sm text-[var(--muted)]">Add an item through Intake before recording a sale.</p></div>;
  return <form action={action} className="surface rounded-[2rem] p-5 sm:p-7">
    <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Close the loop</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Record a completed sale</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Only enter finalized numbers. The item cost is preserved automatically.</p></div>
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="text-sm font-medium">Inventory item</span><select name="unitId" value={unitId} onChange={(event) => { const next = candidates.find((item) => item.id === event.target.value); setUnitId(event.target.value); setSalePrice(next?.askingPriceCents == null ? "" : (next.askingPriceCents / 100).toFixed(2)); if (next?.platform) setPlatform(next.platform); }} className={inputClass}>{candidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku} · {item.status}</option>)}</select></label>
      <label><span className="text-sm font-medium">Sale price</span><div className="relative"><span className="pointer-events-none absolute left-4 top-[1.05rem] text-[var(--muted)]">$</span><input required inputMode="decimal" name="salePrice" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} placeholder="0.00" className={`${inputClass} pl-8`}/></div></label>
      <label><span className="text-sm font-medium">Marketplace</span><select name="platform" value={platform} onChange={(event) => setPlatform(event.target.value as MarketplacePlatform)} className={inputClass}><option value="facebook">Facebook Marketplace</option><option value="ebay">eBay</option><option value="other">Other</option></select></label>
      <label><span className="text-sm font-medium">Sold at</span><input required type="datetime-local" name="soldAt" defaultValue={soldAtDefault} className={inputClass}/></label>
      <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-xs text-[var(--muted)]">Locked item cost (COGS)</p><p className="mt-2 text-xl font-semibold">{selected ? formatMoney(selected.acquisitionCostCents) : "—"}</p></div>
      {[['platformFee','Platform fee'],['paymentFee','Payment fee'],['shippingCost','Shipping paid by business'],['otherCost','Other direct cost']].map(([name, label]) => <label key={name}><span className="text-sm font-medium">{label}</span><div className="relative"><span className="pointer-events-none absolute left-4 top-[1.05rem] text-[var(--muted)]">$</span><input inputMode="decimal" name={name} defaultValue="0.00" className={`${inputClass} pl-8`}/></div></label>)}
    </div>
    {state.message && <p role="alert" className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{state.message}</p>}
    <button disabled={pending} className="mt-7 min-h-13 w-full rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black shadow-[0_0_30px_var(--accent-glow)] disabled:opacity-50">{pending ? "Recording sale…" : "Record sale and mark sold"}</button>
  </form>;
}
