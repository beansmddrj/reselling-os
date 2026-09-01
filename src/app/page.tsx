import Link from "next/link";
import { TeamPanel } from "@/features/team/components/team-panel";
import { getTeamPanelData } from "@/features/team/data/team-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const team = await getTeamPanelData();
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
        {[['Revenue','—','No sales recorded'],['Realized profit','—','No sales recorded'],['Active inventory','0','No active units'],['Ready to post','0','Nothing waiting']].map(([label,value,sub]) => <article key={label} className="surface rounded-3xl p-5"><p className="text-xs font-medium text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p><p className="mt-2 text-[11px] text-[var(--muted)]">{sub}</p></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <article className="surface rounded-[2rem] p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Recent sales</p><p className="mt-1 text-xs text-[var(--muted)]">Real transactions will appear here.</p></div><Link href="/sales" className="text-xs font-semibold text-[var(--accent)]">Open sales</Link></div><div className="mt-8 grid min-h-40 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-center"><div><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-white/5 text-xl">↗</div><p className="mt-3 text-sm font-medium">No sales yet</p><p className="mt-1 text-xs text-[var(--muted)]">Your first completed sale starts the ledger.</p></div></div></article>
        <article className="surface rounded-[2rem] p-6"><p className="text-sm font-semibold">Needs attention</p><p className="mt-1 text-xs text-[var(--muted)]">Only real workflow issues show here.</p><div className="mt-8 rounded-2xl bg-emerald-400/[.06] p-4"><div className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-emerald-400"/>All clear</div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">No incomplete drafts, stale listings, or missing costs.</p></div></article>
      </section>
      <TeamPanel team={team}/>
    </div>
  );
}
