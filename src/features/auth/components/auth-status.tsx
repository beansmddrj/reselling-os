"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthStatus() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? ""));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <div title={email || "Signed in"} className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold">{email ? email[0].toUpperCase() : "S"}</div>
      <button type="button" onClick={() => void signOut()} disabled={signingOut} className="hidden min-h-10 rounded-xl border border-white/10 px-3 text-xs font-semibold text-[var(--muted)] transition hover:text-white disabled:opacity-50 sm:block">{signingOut ? "Signing out…" : "Sign out"}</button>
    </div>
  );
}
