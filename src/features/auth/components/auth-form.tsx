"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "confirmation" ? "That confirmation link could not be completed. Try signing in or request a new account email." : "");

  const requestedNext = searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/intake";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const supabase = createClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(signInError.message);
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() || email.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setMessage("Check your email to confirm your account, then return here to sign in.");
    setPending(false);
  }

  return (
    <div className="surface w-full max-w-md rounded-[2rem] p-6 sm:p-8">
      <div className="grid grid-cols-2 rounded-2xl bg-black/25 p-1" role="tablist" aria-label="Account action">
        {(["signin", "signup"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setError(""); setMessage(""); }} className={`min-h-11 rounded-xl text-sm font-semibold transition ${mode === item ? "bg-white/10 text-white" : "text-[var(--muted)]"}`}>{item === "signin" ? "Sign in" : "Create account"}</button>)}
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {mode === "signup" && <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]" placeholder="Slim" /></label>}
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" inputMode="email" className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]" placeholder="you@example.com" /></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "signup" ? 12 : 1} autoComplete={mode === "signin" ? "current-password" : "new-password"} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]" placeholder={mode === "signup" ? "Use 12+ characters" : "Your password"} /></label>
        {error && <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-100">{error}</div>}
        {message && <div role="status" className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-4 py-3 text-sm leading-5 text-white">{message}</div>}
        <button type="submit" disabled={pending} className="min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-bold text-black shadow-[0_0_35px_var(--accent-glow)] transition active:scale-[.99] disabled:cursor-wait disabled:opacity-60">{pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="mt-5 text-center text-xs leading-5 text-[var(--muted)]">Your session stays signed in on this device. Reselling OS never stores your password.</p>
    </div>
  );
}
