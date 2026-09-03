"use client";

import { useEffect } from "react";
import { reportRuntimeError } from "@/lib/runtime-error-reporting";

export default function ApplicationError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { reportRuntimeError(error, window.location.pathname); }, [error]);

  return <div className="surface mx-auto max-w-xl rounded-[2rem] p-7 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-400/10 text-2xl text-red-200">!</div><h1 className="mt-5 text-2xl font-semibold">This page couldn’t load</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">We saved a safe diagnostic for the workspace admins. Try again, and if it keeps happening they can see where it broke.</p><button type="button" onClick={reset} className="mt-6 min-h-12 rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black">Try again</button></div>;
}
