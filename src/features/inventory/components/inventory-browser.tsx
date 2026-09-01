"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { InventoryListItem, InventoryStatus } from "@/features/inventory/types";

type Filter = "all" | InventoryStatus;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" }, { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" }, { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function statusStyle(status: InventoryStatus) {
  if (status === "active") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (status === "ready") return "border-sky-400/25 bg-sky-400/10 text-sky-300";
  if (status === "sold") return "border-white/10 bg-white/5 text-[var(--muted)]";
  return "border-[var(--accent)]/20 bg-[var(--accent)]/8 text-[var(--accent)]";
}

type QuickMenu = { item: InventoryListItem; x: number; y: number };

function InventoryCard({ item, onMenu }: { item: InventoryListItem; onMenu: (menu: QuickMenu) => void }) {
  return (
    <article onContextMenu={(event) => { event.preventDefault(); onMenu({ item, x: event.clientX, y: event.clientY }); }} className="surface group relative overflow-hidden rounded-[1.7rem] transition hover:-translate-y-0.5 hover:border-white/15">
      <Link href={`/inventory/${item.id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] active:scale-[.99]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--panel-2)]">
        {item.leadPhotoUrl ? (
          // Private signed URLs are short-lived and cannot use a stable Next image host configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.leadPhotoUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : <div className="grid h-full place-items-center text-4xl text-white/15">▦</div>}
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] backdrop-blur-xl ${statusStyle(item.status)}`}>{item.status}</span>
        </div>
        <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold tracking-tight">{item.name}</h2><p className="mt-1 truncate text-xs text-[var(--muted)]">{[item.brand, item.category, item.condition].filter(Boolean).join(" · ") || item.sku}</p></div><span className="shrink-0 text-lg text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]">→</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/8 pt-4"><div><p className="text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">Cost</p><p className="mt-1 text-sm font-semibold">{money.format(item.acquisitionCostCents / 100)}</p></div><div><p className="text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">Asking</p><p className="mt-1 text-sm font-semibold">{item.askingPriceCents === null ? "—" : money.format(item.askingPriceCents / 100)}</p></div></div>
        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-[var(--muted)]"><span className="truncate">{item.storageLocation || "No location"}</span><span className="shrink-0">{date.format(new Date(item.acquiredAt))}</span></div>
        </div>
      </Link>
      <button type="button" aria-label={`Quick actions for ${item.name}`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); onMenu({ item, x: rect.right, y: rect.bottom + 6 }); }} className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full border border-white/10 bg-black/65 text-lg font-bold backdrop-blur-xl transition hover:bg-black focus-visible:outline-2 focus-visible:outline-[var(--accent)]">⋯</button>
    </article>
  );
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Plain HTTP LAN origins may expose the Clipboard API but reject its use.
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

export function InventoryBrowser({ items }: { items: InventoryListItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [quickMenu, setQuickMenu] = useState<QuickMenu | null>(null);
  const [copiedSku, setCopiedSku] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const counts = useMemo(() => Object.fromEntries(filters.map(({ value }) => [value, value === "all" ? items.length : items.filter((item) => item.status === value).length])), [items]);
  const visibleItems = useMemo(() => items.filter((item) => {
    if (filter !== "all" && item.status !== filter) return false;
    if (!deferredQuery) return true;
    return [item.name, item.brand, item.category, item.condition, item.sku, item.storageLocation].some((value) => value?.toLowerCase().includes(deferredQuery));
  }), [items, filter, deferredQuery]);

  useEffect(() => {
    if (!quickMenu) return;
    const close = () => setQuickMenu(null);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("resize", close); };
  }, [quickMenu]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Inventory</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Everything you own.</h1><p className="mt-2 text-sm text-[var(--muted)]">{items.length ? `${items.length} physical ${items.length === 1 ? "unit" : "units"} in your pipeline.` : "Physical units are the source of truth."}</p></div><Link href="/intake" className="hidden rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-black sm:block">+ Add product</Link></div>
      <section className="surface rounded-[2rem] p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter inventory by status">{filters.map(({ value, label }) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-semibold transition ${filter === value ? "bg-white/10 text-white" : "text-[var(--muted)] hover:bg-white/5 hover:text-white"}`}>{label}<span className="ml-2 text-[10px] opacity-60">{counts[value]}</span></button>)}</div><label className="relative block md:w-72"><span className="sr-only">Search inventory</span><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, location…" className="min-h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm outline-none placeholder:text-white/25 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]" /></label></div>
        {visibleItems.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <InventoryCard key={item.id} item={item} onMenu={setQuickMenu} />)}</div> : <div className="mt-5 grid min-h-[340px] place-items-center rounded-3xl border border-dashed border-white/10 bg-black/10 p-6 text-center"><div><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-2xl">▦</div><h2 className="mt-4 font-semibold">{items.length ? "No matching inventory" : "Inventory is empty"}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{items.length ? "Try another status or clear your search." : "Complete Smart Intake and your first physical unit will appear here."}</p>{items.length ? <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-5 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold">Clear filters</button> : <Link href="/intake" className="mt-5 inline-block rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-black">Start intake</Link>}</div></div>}
      </section>
      {quickMenu && <div role="menu" aria-label={`Quick actions for ${quickMenu.item.name}`} onClick={(event) => event.stopPropagation()} className="fixed z-50 min-w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#151820]/98 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl" style={{ left: Math.min(quickMenu.x, window.innerWidth - 224), top: Math.min(quickMenu.y, window.innerHeight - 210) }}><p className="truncate border-b border-white/8 px-3 py-2 text-xs font-semibold text-[var(--muted)]">{quickMenu.item.name}</p><Link role="menuitem" href={`/inventory/${quickMenu.item.id}`} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-white/7">View details</Link><Link role="menuitem" href={`/inventory/${quickMenu.item.id}/edit`} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-white/7">Edit item</Link><button role="menuitem" type="button" onClick={() => { void copyText(quickMenu.item.sku).then(() => { setCopiedSku(quickMenu.item.sku); window.setTimeout(() => setCopiedSku(""), 1500); setQuickMenu(null); }); }} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-white/7">Copy SKU</button><Link role="menuitem" href="/intake" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-white/7">Add new product</Link></div>}
      {copiedSku && <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black shadow-xl">Copied {copiedSku}</div>}
      <Link href="/intake" className="fixed bottom-[calc(max(.75rem,env(safe-area-inset-bottom))+4.7rem)] right-5 z-30 grid size-14 place-items-center rounded-2xl bg-[var(--accent)] text-2xl font-light text-black shadow-[0_0_35px_var(--accent-glow)] sm:hidden" aria-label="Add product">+</Link>
    </div>
  );
}
