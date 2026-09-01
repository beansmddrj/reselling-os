import Link from "next/link";
import { TeamPanel } from "@/features/team/components/team-panel";
import { getTeamPanelData } from "@/features/team/data/team-repository";
import { getSalesOverview } from "@/features/sales/data/sales-repository";
import { formatMoney } from "@/features/sales/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [team, overview] = await Promise.all([getTeamPanelData(), getSalesOverview()]);
  const cards = [
    ["Revenue", overview.sales.length ? formatMoney(overview.revenueCents) : "—", overview.sales.length ? `${overview.sales.length} completed ${overview.sales.length === 1 ? "sale" : "sales"}` : "No sales recorded"],
    ["Realized profit", overview.sales.length ? formatMoney(overview.profitCents) : "—", overview.sales.length ? "After COGS and direct costs" : "No sales recorded"],
    ["Active inventory", String(overview.activeInventoryCount), overview.activeInventoryCount ? "Currently listed" : "No active units"],
    ["Ready to post", String(overview.readyInventoryCount), overview.readyInventoryCount ? "Waiting to be listed" : "Nothing waiting"],
  ];
  return (
    <div className="space-y-7">
      <section className="noise surface relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="absolute -right-24 -top-28 size-72 rounded-full bg-[var(--accent)] opacity-[.08] blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Command center</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Your resale operation,<br/><span className="text-[var(--muted)]">without the admin mess.</span></h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">The pipeline is connected. Start by intaking your first product and Reselling OS will build its real operating picture from there.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/intake" className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-black shadow-[0_0_30px_var(--accent-glow)] transition hover:brightness-110 active:scale-[.98]">Start intake →</Link><Link href="/inventory" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-white/8">View inventory</Link></div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label,value,sub]) => <article key={label} className="surface rounded-3xl p-5"><p className="text-xs font-medium text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p><p className="mt-2 text-[11px] text-[var(--muted)]">{sub}</p></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <article className="surface rounded-[2rem] p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Recent sales</p><p className="mt-1 text-xs text-[var(--muted)]">Real transactions from your shared workspace.</p></div><Link href="/sales" className="text-xs font-semibold text-[var(--accent)]">Open sales</Link></div>{overview.sales.length ? <div className="mt-5 divide-y divide-white/8">{overview.sales.slice(0, 4).map((sale) => <Link key={sale.id} href={`/inventory/${sale.inventoryUnitId}`} className="flex min-h-16 items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{sale.productName}</p><p className="mt-1 text-xs text-[var(--muted)]">{sale.sku} · {sale.platform}</p></div><div className="text-right"><p className="text-sm font-semibold">{formatMoney(sale.salePriceCents)}</p><p className={`mt-1 text-xs ${sale.profitCents >= 0 ? "text-[var(--accent)]" : "text-red-300"}`}>{formatMoney(sale.profitCents)} profit</p></div></Link>)}</div> : <div className="mt-8 grid min-h-40 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-center"><div><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-white/5 text-xl">↗</div><p className="mt-3 text-sm font-medium">No sales yet</p><p className="mt-1 text-xs text-[var(--muted)]">Your first completed sale starts the ledger.</p></div></div>}</article>
        <article className="surface rounded-[2rem] p-6"><p className="text-sm font-semibold">Needs attention</p><p className="mt-1 text-xs text-[var(--muted)]">Only real workflow issues show here.</p><div className="mt-8 rounded-2xl bg-emerald-400/[.06] p-4"><div className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-emerald-400"/>All clear</div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">No incomplete drafts, stale listings, or missing costs.</p></div></article>
      </section>
      <TeamPanel team={team}/>
    </div>
  );
}
