"use client";

import { useEffect } from "react";
import { reportRuntimeError } from "@/lib/runtime-error-reporting";

export default function InventoryError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { reportRuntimeError(error, "/inventory"); }, [error]);
  return <div className="surface mx-auto max-w-xl rounded-[2rem] p-7 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-400/10 text-2xl text-red-200">!</div><h1 className="mt-5 text-2xl font-semibold">Inventory couldn’t load</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{error.message}</p><button type="button" onClick={reset} className="mt-6 min-h-12 rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black">Try again</button></div>;
}
