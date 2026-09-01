import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInventoryDetail } from "@/features/inventory/data/inventory-repository";
import { DeleteInventoryButton } from "@/features/inventory/components/delete-inventory-dialog";
import { InventoryLifecycleActions } from "@/features/inventory/components/inventory-lifecycle-actions";

export const metadata: Metadata = { title: "Inventory item" };
export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--muted)]">{label}</dt><dd className="mt-1 text-sm text-white">{value || "—"}</dd></div>;
}

export default async function InventoryDetailPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const item = await getInventoryDetail(unitId);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/inventory" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-[var(--muted)] hover:text-white">← Back to inventory</Link>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
        <section className="surface overflow-hidden rounded-[2rem]">
          {item.photos.length ? <div className="grid grid-cols-2 gap-1 bg-black/30 sm:grid-cols-3">{item.photos.map((photo, index) => <div key={photo.id} className={`overflow-hidden bg-[var(--panel-2)] ${index === 0 ? "col-span-2 row-span-2 aspect-square sm:col-span-2" : "aspect-square"}`}>
            {/* Private signed URLs are short-lived and cannot use a stable Next image host configuration. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={`${item.name} photo ${index + 1}`} className="h-full w-full object-cover"/>
          </div>)}</div> : <div className="grid aspect-[4/3] place-items-center text-6xl text-white/10">▦</div>}
        </section>
        <section className="surface h-fit rounded-[2rem] p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Inventory unit</p><div className="flex gap-2">{item.sellMultiple && <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-white/70">Repeat</span>}<span className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--accent)]">{item.status}</span></div></div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">{item.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{[item.brand, item.category, item.condition].filter(Boolean).join(" · ") || item.sku}</p>
          <div className="mt-7 grid grid-cols-2 gap-4 rounded-2xl bg-black/20 p-4"><div><p className="text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">Item cost</p><p className="mt-1 text-xl font-semibold">{money.format(item.acquisitionCostCents / 100)}</p></div><div><p className="text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">Asking</p><p className="mt-1 text-xl font-semibold">{item.askingPriceCents === null ? "—" : money.format(item.askingPriceCents / 100)}</p></div></div>
          <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/8 pt-6"><Detail label="SKU" value={item.sku}/><Detail label="Acquired" value={date.format(new Date(item.acquiredAt))}/><Detail label="Storage" value={item.storageLocation}/><Detail label="Platform" value={item.listingPlatform}/><Detail label="Size / model" value={item.size}/><Detail label="Color" value={item.color}/></dl>
          {item.description && <div className="mt-7 border-t border-white/8 pt-6"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--muted)]">Product notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/80">{item.description}</p></div>}
          <Link href={`/inventory/${item.id}/edit`} className="mt-7 grid min-h-12 w-full place-items-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-black">Edit item</Link>
        </section>
      </div>
      <InventoryLifecycleActions unitId={item.id} status={item.status} externalUrl={item.listing?.externalUrl ?? null} sellMultiple={item.sellMultiple} nextRepeatUnitId={item.nextRepeatUnitId}/>
      <section className="surface rounded-[2rem] p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Listing</p><h2 className="mt-2 text-xl font-semibold">{item.listing?.title || "No listing created"}</h2></div>{item.listing && <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">{item.listing.status}</span>}</div>{item.listing?.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{item.listing.description}</p>}<p className="mt-5 text-xs text-[var(--muted)]">{item.status === "active" ? "This listing is recorded as live on its marketplace." : "Nothing here has been posted to a marketplace."}</p></section>
      <section className="rounded-[2rem] border border-red-400/15 bg-red-400/[.035] p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-red-300">Danger zone</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Permanently remove this physical item and, when it is the final unit, its product and listing draft.</p><div className="mt-4 max-w-xs"><DeleteInventoryButton target={{ id: item.id, name: item.name, status: item.status }}/></div></section>
    </div>
  );
}
