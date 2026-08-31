"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatus } from "@/features/auth/components/auth-status";

const nav = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/inventory", label: "Inventory", icon: "▦" },
  { href: "/intake", label: "Intake", icon: "+", primary: true },
  { href: "/sales", label: "Sales", icon: "↗" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return children;
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/8 bg-[var(--panel)]/90 p-5 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-[var(--accent)] font-black text-black shadow-[0_0_35px_var(--accent-glow)]">R</div>
          <div><p className="font-semibold tracking-tight">Reselling OS</p><p className="text-xs text-[var(--muted)]">Operations console</p></div>
        </div>
        <nav className="mt-8 space-y-2">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition ${active ? "bg-white/9 text-white shadow-inner" : "text-[var(--muted)] hover:bg-white/5 hover:text-white"}`}><span className={`grid size-8 place-items-center rounded-xl ${item.primary ? "bg-[var(--accent)] text-black" : "bg-white/5"}`}>{item.icon}</span>{item.label}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-3xl border border-white/8 bg-white/[.035] p-4"><p className="text-xs uppercase tracking-[.18em] text-[var(--muted)]">System</p><div className="mt-3 flex items-center gap-2 text-sm"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]"/>Development online</div></div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/6 bg-[var(--bg)]/75 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Reselling OS</p><p className="mt-1 text-sm text-[var(--muted)]">Build the pipeline. Move the inventory.</p></div>
            <AuthStatus />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 pb-28 pt-7 sm:px-8 lg:px-10 lg:pb-12">{children}</main>
      </div>

      <nav data-mobile-nav className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-4 rounded-[1.7rem] border border-white/10 bg-[#101218]/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-2xl lg:hidden">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.25rem] text-[10px] font-semibold transition active:scale-95 ${active ? "text-white" : "text-[var(--muted)]"}`}><span className={`grid size-8 place-items-center rounded-xl text-base transition ${item.primary ? "bg-[var(--accent)] text-black shadow-[0_0_25px_var(--accent-glow)]" : active ? "bg-white/8" : ""}`}>{item.icon}</span>{item.label}</Link>;
        })}
      </nav>
    </div>
  );
}
