import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AuthPage() {
  return (
    <main className="noise relative grid min-h-dvh place-items-center overflow-hidden px-5 py-[max(2rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] size-[38rem] -translate-x-1/2 rounded-full bg-[var(--accent)]/8 blur-3xl" />
      <div className="relative z-10 flex w-full flex-col items-center">
        <div className="mb-8 flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-lg font-black text-black shadow-[0_0_35px_var(--accent-glow)]">R</div><div><p className="font-semibold tracking-tight">Reselling OS</p><p className="text-xs text-[var(--muted)]">Your inventory pipeline</p></div></div>
        <Suspense fallback={<div className="surface h-96 w-full max-w-md animate-pulse rounded-[2rem]" />}><AuthForm /></Suspense>
      </div>
    </main>
  );
}
