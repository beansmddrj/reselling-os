"use client";

import { useState, useTransition } from "react";
import { updateContactPreferencesAction } from "@/features/settings/actions/update-settings";

export function ContactPreferencesForm({ initialPhone, initialMarketingOptIn }: { initialPhone: string; initialMarketingOptIn: boolean }) {
  const [phone, setPhone] = useState(initialPhone);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return <section className="surface rounded-[1.75rem] p-5 sm:p-6"><div><h2 className="font-semibold">Phone & contact preferences</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Optional. This is not used to sign you in, and only you plus the workspace owner can see it.</p></div><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); startTransition(async () => setMessage((await updateContactPreferencesAction(phone, marketingOptIn)).message)); }}><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Phone number</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+13035551234" className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]"/><span className="mt-2 block text-xs leading-5 text-[var(--muted)]">Include your country code. Leave it blank and save to remove it.</span></label><label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><input type="checkbox" checked={marketingOptIn} disabled={!phone.trim()} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-1 size-4 accent-lime-300"/><span><span className="block text-sm font-semibold">I want optional Reselling OS updates by text.</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">No promotional texts are being sent right now. You can opt out here before they ever begin.</span></span></label><button disabled={pending} className="min-h-12 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-black disabled:opacity-40">{pending ? "Saving…" : "Save contact preferences"}</button>{message && <p role="status" className="text-sm text-[var(--accent)]">{message}</p>}</form></section>;
}
