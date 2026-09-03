"use client";

import { useState, useTransition } from "react";
import { updateContactPreferencesAction } from "@/features/settings/actions/update-settings";

const countryCodes = [
  { value: "+1", label: "US +1" },
  { value: "+1", label: "Canada +1" },
  { value: "+44", label: "UK +44" },
  { value: "+52", label: "Mexico +52" },
  { value: "+61", label: "Australia +61" },
  { value: "+49", label: "Germany +49" },
  { value: "+33", label: "France +33" },
];

function splitPhone(phone: string) {
  const match = [...countryCodes].sort((a, b) => b.value.length - a.value.length).find((country) => phone.startsWith(country.value));
  return { countryCode: match?.value ?? "+1", localNumber: match ? phone.slice(match.value.length) : phone.replace(/^\+/, "") };
}

export function ContactPreferencesForm({ initialPhone, initialMarketingOptIn }: { initialPhone: string; initialMarketingOptIn: boolean }) {
  const initial = splitPhone(initialPhone);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [localNumber, setLocalNumber] = useState(initial.localNumber);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return <section className="surface rounded-[1.75rem] p-5 sm:p-6"><div><h2 className="font-semibold">Phone & contact preferences</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Optional account contact info for workspace support and future product updates. It is not used to sign you in or shown to teammates.</p></div><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); startTransition(async () => setMessage((await updateContactPreferencesAction(`${countryCode}${localNumber}`, marketingOptIn)).message)); }}><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Phone number</span><span className="flex overflow-hidden rounded-2xl border border-white/10 bg-black/20 focus-within:border-[var(--accent)] focus-within:ring-3 focus-within:ring-[var(--accent-glow)]"><select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} aria-label="Country calling code" className="min-h-12 border-r border-white/10 bg-white/[.04] px-3 text-sm outline-none"><option value="+1">+1</option><option value="+44">+44</option><option value="+52">+52</option><option value="+61">+61</option><option value="+49">+49</option><option value="+33">+33</option></select><input value={localNumber} onChange={(event) => setLocalNumber(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="970 637 9134" className="min-h-12 min-w-0 flex-1 bg-transparent px-4 outline-none"/></span><span className="mt-2 block text-xs leading-5 text-[var(--muted)]">Choose your country code, then enter your number normally. Leave the number blank and save to remove it.</span></label><label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><input type="checkbox" checked={marketingOptIn} disabled={!localNumber.trim()} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-1 size-4 accent-lime-300"/><span><span className="block text-sm font-semibold">I’d like optional Reselling OS updates by text.</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">No promotional texts are being sent right now. You can change this anytime.</span></span></label><button disabled={pending} className="min-h-12 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-black disabled:opacity-40">{pending ? "Saving…" : "Save contact preferences"}</button>{message && <p role="status" className="text-sm text-[var(--accent)]">{message}</p>}</form></section>;
}
