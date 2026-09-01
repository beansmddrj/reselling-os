import Link from "next/link";
import { TeamPanel } from "@/features/team/components/team-panel";
import { getTeamPanelData } from "@/features/team/data/team-repository";
import { getSalesOverview } from "@/features/sales/data/sales-repository";
import { getActivityFeed } from "@/features/activity/data/activity-repository";
import { formatMoney } from "@/features/sales/money";

export const dynamic = "force-dynamic";
const time = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function Home() {
  const [team, overview, activity] = await Promise.all([getTeamPanelData(), getSalesOverview(), getActivityFeed()]);
  const cards = [
    ...(overview.isOwner ? [["Revenue", overview.sales.length ? formatMoney(overview.revenueCents) : "—", "Owner only"], ["Realized profit", overview.sales.length ? formatMoney(overview.profitCents) : "—", "Owner only"]] : [["Sales recorded", String(overview.sales.length), "Shared team activity"], ["Available to sell", String(overview.candidates.length), "Current sellable units"]]),
    ["Active inventory", String(overview.activeInventoryCount), overview.activeInventoryCount ? "Currently listed" : "No active units"],
    ["Ready to post", String(overview.readyInventoryCount), overview.readyInventoryCount ? "Waiting to be listed" : "Nothing waiting"],
  ];
  return <div className="space-y-7">
    <section className="noise surface relative overflow-hidden rounded-[2rem] p-6 sm:p-8"><div className="absolute -right-24 -top-28 size-72 rounded-full bg-[var(--accent)] opacity-[.08] blur-3xl"/><div className="relative max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Command center</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Your resale operation,<br/><span className="text-[var(--muted)]">without the admin mess.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">Inventory, team activity, and sales stay connected in one shared workspace.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/intake" className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-black shadow-[0_0_30px_var(--accent-glow)]">Start intake →</Link><Link href="/inventory" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold">View inventory</Link></div></div></section>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value, sub]) => <article key={label} className="surface rounded-3xl p-5"><p className="text-xs font-medium text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p><p className="mt-2 text-[11px] text-[var(--muted)]">{sub}</p></article>)}</section>
    <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <article className="surface rounded-[2rem] p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Recent sales</p><p className="mt-1 text-xs text-[var(--muted)]">Shared sale activity; private expenses stay owner-only.</p></div><Link href="/sales" className="text-xs font-semibold text-[var(--accent)]">Open sales</Link></div>{overview.sales.length ? <div className="mt-5 divide-y divide-white/8">{overview.sales.slice(0, 4).map((sale) => <Link key={sale.id} href={`/inventory/${sale.inventoryUnitId}`} className="flex min-h-16 items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{sale.productName}</p><p className="mt-1 text-xs text-[var(--muted)]">{sale.sku} · {sale.platform}</p></div><div className="text-right"><p className="text-sm font-semibold">{formatMoney(sale.salePriceCents)}</p>{overview.isOwner && <p className={`mt-1 text-xs ${(sale.profitCents ?? 0) >= 0 ? "text-[var(--accent)]" : "text-red-300"}`}>{formatMoney(sale.profitCents ?? 0)} profit</p>}</div></Link>)}</div> : <p className="mt-8 text-sm text-[var(--muted)]">No sales yet.</p>}</article>
      <article className="surface rounded-[2rem] p-6"><p className="text-sm font-semibold">Team activity</p><p className="mt-1 text-xs text-[var(--muted)]">Actions are logged without exposing private financial details.</p>{activity.length ? <div className="mt-5 divide-y divide-white/8">{activity.slice(0, 6).map((item) => <div key={item.id} className="py-3"><p className="text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-[var(--muted)]">{item.actor} · {time.format(new Date(item.occurredAt))}</p></div>)}</div> : <p className="mt-8 text-sm text-[var(--muted)]">Activity will appear as your team works.</p>}</article>
    </section>
    <TeamPanel team={team}/>
  </div>;
}
