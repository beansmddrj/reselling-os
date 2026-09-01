import Link from "next/link";
import { getSalesOverview } from "@/features/sales/data/sales-repository";
import { formatMoney } from "@/features/sales/money";

export const dynamic = "force-dynamic";
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ recorded?: string }> }) {
  const [overview, query] = await Promise.all([getSalesOverview(), searchParams]);
  const cards = [["Revenue", formatMoney(overview.revenueCents)], ["Net profit", formatMoney(overview.profitCents)], ["Units sold", String(overview.sales.length)], ["Avg. sale", overview.sales.length ? formatMoney(overview.averageSaleCents) : "—"]];
  return <div className="space-y-6">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Sales</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">Realized money only.</h1><p className="mt-2 text-sm text-[var(--muted)]">Every dollar traces back to a completed transaction.</p></div><Link href="/sales/record" className="grid min-h-12 place-items-center rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black">Record sale</Link></div>
    {query.recorded === "1" && <div role="status" className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-200">Sale recorded. Inventory and dashboard totals are updated.</div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="surface rounded-3xl p-5"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}</div>
    <section className="surface overflow-hidden rounded-[2rem]"><div className="p-5 sm:p-6"><h2 className="font-semibold">Transaction ledger</h2><p className="mt-1 text-xs text-[var(--muted)]">Sale price, costs, fees, and deterministic realized profit.</p></div>
      {!overview.sales.length ? <div className="m-5 mt-0 grid min-h-64 place-items-center rounded-3xl border border-dashed border-white/10 bg-black/10 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/5 text-xl">$</div><p className="mt-4 text-sm font-medium">No transactions recorded</p><p className="mt-1 text-xs text-[var(--muted)]">Your first completed sale starts the ledger.</p></div></div> : <div className="divide-y divide-white/8">{overview.sales.map((sale) => <Link key={sale.id} href={`/inventory/${sale.inventoryUnitId}`} className="grid gap-3 p-5 transition hover:bg-white/[.025] sm:grid-cols-[minmax(0,1fr)_repeat(3,8rem)] sm:items-center sm:px-6"><div><p className="font-semibold">{sale.productName}</p><p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{sale.sku} · {sale.platform} · {date.format(new Date(sale.soldAt))}</p></div><div><p className="text-[10px] uppercase text-[var(--muted)]">Revenue</p><p className="mt-1 text-sm font-semibold">{formatMoney(sale.salePriceCents)}</p></div><div><p className="text-[10px] uppercase text-[var(--muted)]">Total costs</p><p className="mt-1 text-sm font-semibold">{formatMoney(sale.salePriceCents - sale.profitCents)}</p></div><div><p className="text-[10px] uppercase text-[var(--muted)]">Profit</p><p className={`mt-1 text-sm font-bold ${sale.profitCents >= 0 ? "text-[var(--accent)]" : "text-red-300"}`}>{formatMoney(sale.profitCents)}</p></div></Link>)}</div>}
    </section>
  </div>;
}
