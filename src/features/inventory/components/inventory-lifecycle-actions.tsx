"use client";

import { useActionState } from "react";
import { transitionInventoryItemAction, type InventoryTransitionState } from "@/features/inventory/actions/transition-inventory-item";
import type { InventoryStatus } from "@/features/inventory/types";

export function InventoryLifecycleActions({ unitId, status, externalUrl }: { unitId: string; status: InventoryStatus; externalUrl: string | null }) {
  const initialState: InventoryTransitionState = { status: "idle", message: "" };
  const [state, action, pending] = useActionState(transitionInventoryItemAction, initialState);
  if (status === "sold") return null;

  return (
    <section className="surface rounded-[2rem] p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Next step</p>
      {status === "draft" && <><h2 className="mt-2 text-xl font-semibold">Finish preparation</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">This checks that the item has a photo, title, description, and asking price before moving it to Ready.</p><form action={action} className="mt-5"><input type="hidden" name="unitId" value={unitId}/><input type="hidden" name="targetStatus" value="ready"/><button disabled={pending} className="min-h-12 rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black disabled:opacity-50">{pending ? "Checking…" : "Mark ready to list"}</button></form></>}
      {status === "ready" && <><h2 className="mt-2 text-xl font-semibold">Mark it posted</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">After you post the listing, paste its marketplace link so Reselling OS can track where it is live.</p><form action={action} className="mt-5 flex flex-col gap-3 sm:flex-row"><input type="hidden" name="unitId" value={unitId}/><input type="hidden" name="targetStatus" value="active"/><label className="flex-1"><span className="sr-only">Marketplace listing URL</span><input required type="url" name="externalUrl" defaultValue={externalUrl ?? ""} placeholder="https://www.facebook.com/marketplace/item/…" className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none placeholder:text-white/25 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]"/></label><button disabled={pending} className="min-h-12 rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black disabled:opacity-50">{pending ? "Saving…" : "Mark active"}</button></form></>}
      {status === "active" && <><h2 className="mt-2 text-xl font-semibold">Currently listed</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">This item stays Active until you record a sale or move it back to Ready.</p><div className="mt-5 flex flex-wrap gap-3">{externalUrl && <a href={externalUrl} target="_blank" rel="noreferrer" className="grid min-h-12 place-items-center rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black">Open listing ↗</a>}<form action={action}><input type="hidden" name="unitId" value={unitId}/><input type="hidden" name="targetStatus" value="ready"/><button disabled={pending} className="min-h-12 rounded-2xl border border-white/10 px-6 text-sm font-semibold disabled:opacity-50">{pending ? "Updating…" : "Listing ended / pause"}</button></form></div></>}
      {state.message && <p role="status" className={`mt-4 text-sm ${state.status === "error" ? "text-red-300" : "text-[var(--accent)]"}`}>{state.message}</p>}
    </section>
  );
}
