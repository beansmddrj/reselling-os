"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 15 * 1024 * 1024;
const imageExtensions = /\.(?:jpe?g|png|webp|heic|heif)$/i;
type MomentType = "customer" | "item" | "package";

function fileName(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return `${crypto.randomUUID()}.${extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg"}`;
}

export function SaleMomentCapture({ saleId, productName, repeatable, existingMomentUrl }: { saleId: string; productName: string; repeatable: boolean; existingMomentUrl?: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [momentType, setMomentType] = useState<MomentType>("item");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (existingMomentUrl) return <div className="surface overflow-hidden rounded-[2rem]"><img src={existingMomentUrl} alt={`Sold Moment for ${productName}`} className="max-h-[40rem] w-full object-contain bg-black"/><div className="p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Sold Moment</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Archived with this sale.</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{productName} · This photo is stored for your later social-content workflow and was not posted anywhere.</p><button type="button" onClick={() => { router.replace("/sales?recorded=1"); router.refresh(); }} className="mt-6 min-h-12 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-black">Back to sales</button></div></div>;
  function skip() { router.replace("/sales?recorded=1"); router.refresh(); }
  function choose(next: File | undefined) {
    setError("");
    if (!next) return;
    if (!(next.type.startsWith("image/") || imageExtensions.test(next.name))) { setError("Choose an image file."); return; }
    if (next.size > MAX_BYTES) { setError("Keep the photo under 15 MB."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next));
  }
  async function save() {
    if (!file || saving) return;
    setSaving(true); setError("");
    const supabase = createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { setSaving(false); setError("Sign in again before saving this photo."); return; }
    const membership = await supabase.from("business_members").select("business_owner_id, role, joined_at").eq("user_id", auth.user.id).order("joined_at");
    const selected = membership.data?.find((item) => item.role === "member") ?? membership.data?.[0];
    if (membership.error || !selected) { setSaving(false); setError("Your workspace could not be loaded."); return; }
    const path = `${selected.business_owner_id}/${saleId}/${fileName(file)}`;
    const upload = await supabase.storage.from("sale-moments").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (upload.error) { setSaving(false); setError(`Could not upload photo: ${upload.error.message}`); return; }
    const saveResult = await supabase.from("sale_moments").insert({ owner_id: selected.business_owner_id, sale_id: saleId, storage_path: path, moment_type: momentType });
    if (saveResult.error) { await supabase.storage.from("sale-moments").remove([path]); setSaving(false); setError(`Could not save photo: ${saveResult.error.message}`); return; }
    router.replace("/sales?recorded=1&moment=1"); router.refresh();
  }
  return <div className="surface rounded-[2rem] p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Sale recorded</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Capture the win?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Optional—take one photo for your private Sold Moments archive. A customer holding it, the item, or the package all work.</p>{repeatable && <p className="mt-4 rounded-2xl border border-[var(--accent)]/15 bg-[var(--accent)]/[.05] px-4 py-3 text-sm text-white/85">This is a repeatable listing. The sold unit stays in history and a fresh available unit remains under the same listing—no duplicate listing clutter.</p>}<div className="mt-7"><input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }}/>{preview ? <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/25">{/* User-selected local preview. */}{ }<img src={preview} alt="Selected sold moment" className="aspect-[4/5] w-full object-cover sm:max-h-[32rem]"/><button type="button" onClick={() => inputRef.current?.click()} className="w-full border-t border-white/10 px-4 py-3 text-sm font-semibold">Replace photo</button></div> : <button type="button" onClick={() => inputRef.current?.click()} className="grid min-h-60 w-full place-items-center rounded-[1.6rem] border border-dashed border-[var(--accent)]/55 bg-[var(--accent)]/[.035] px-5 text-center"><span><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--accent)] text-2xl text-black">+</span><strong className="mt-4 block">Take or choose a photo</strong><span className="mt-1 block text-sm text-[var(--muted)]">Camera or photo library · one optional image</span></span></button>}</div><fieldset className="mt-6"><legend className="text-sm font-semibold">What does it show?</legend><div className="mt-3 grid grid-cols-3 gap-2">{([['customer', 'Customer'], ['item', 'Item'], ['package', 'Package']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMomentType(value)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${momentType === value ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-white/10 bg-white/[.03] text-[var(--muted)]"}`}>{label}</button>)}</div></fieldset>{error && <p role="alert" className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p>}<div className="mt-7 grid gap-3 sm:grid-cols-2"><button disabled={!file || saving} type="button" onClick={() => void save()} className="min-h-13 rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black shadow-[0_0_30px_var(--accent-glow)] disabled:opacity-40">{saving ? "Saving photo…" : "Save Sold Moment"}</button><button type="button" disabled={saving} onClick={skip} className="min-h-13 rounded-2xl border border-white/10 bg-white/[.03] px-6 text-sm font-semibold">Skip for now</button></div><p className="mt-4 text-center text-xs text-[var(--muted)]">{productName} · This is saved for your team’s later social-content workflow, not posted anywhere.</p></div>;
}
