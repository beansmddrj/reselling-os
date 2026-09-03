"use client";

import { useEffect } from "react";
import { reportRuntimeError } from "@/lib/runtime-error-reporting";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { reportRuntimeError(error, "global"); }, [error]);

  return <html lang="en"><body className="grid min-h-dvh place-items-center bg-[#090a0d] px-5 font-sans text-white"><div className="max-w-md text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-lime-300">Reselling OS</p><h1 className="mt-4 text-3xl font-semibold">Something went wrong.</h1><p className="mt-3 text-sm leading-6 text-slate-300">Try reloading the app. If you were signed in, a safe diagnostic was sent to the workspace admins.</p><button type="button" onClick={reset} className="mt-6 min-h-12 rounded-2xl bg-lime-300 px-6 text-sm font-bold text-black">Reload app</button></div></body></html>;
}
