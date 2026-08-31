"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { clearLocalDraft, loadLocalDraft, saveLocalDraft } from "@/features/intake/data/local-intake-draft";
import { finalizeRemoteDraft, getPhotoPreview, removeRemotePhoto, saveRemoteDraft } from "@/features/intake/data/intake-draft-repository";
import { emptyDraft, type IntakeDraftForm, type IntakePhoto } from "@/features/intake/types";

const MAX_PHOTOS = 5;

type SaveState = "restoring" | "local" | "saving" | "synced" | "error";

const PhotoCard = memo(function PhotoCard({
  photo,
  index,
  count,
  onRemove,
  onReplace,
  onMove,
}: {
  photo: IntakePhoto;
  index: number;
  count: number;
  onRemove: (id: string) => void;
  onReplace: (id: string, files: FileList | null) => void;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <article
      className="group relative aspect-[4/5] min-w-0 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[var(--panel-2)]"
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/photo-index", String(index))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const from = Number(event.dataTransfer.getData("text/photo-index"));
        if (Number.isInteger(from)) onMove(from, index);
      }}
    >
      {photo.previewUrl ? (
        // Blob and signed URLs are generated from user-selected files/private storage.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.previewUrl} alt={`Product photo ${index + 1}`} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center px-3 text-center text-xs text-[var(--muted)]">Preview reconnecting…</div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-black/65 text-xs font-bold">{index + 1}</span>
        <button type="button" onClick={() => onRemove(photo.id)} aria-label={`Remove photo ${index + 1}`} className="grid size-9 place-items-center rounded-full bg-black/70 text-lg transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">×</button>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-10">
        <div className="flex gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move photo ${index + 1} left`} className="grid size-9 place-items-center rounded-xl bg-black/70 disabled:opacity-30">←</button>
          <button type="button" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move photo ${index + 1} right`} className="grid size-9 place-items-center rounded-xl bg-black/70 disabled:opacity-30">→</button>
        </div>
        <label className="cursor-pointer rounded-xl bg-black/70 px-3 py-2 text-xs font-semibold focus-within:outline-2 focus-within:outline-[var(--accent)]">
          Replace
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => { onReplace(photo.id, event.target.files); event.target.value = ""; }} />
        </label>
      </div>
    </article>
  );
});

function Field({ label, name, value, onChange, required, ...props }: {
  label: string;
  name: keyof IntakeDraftForm;
  value: string;
  onChange: (name: keyof IntakeDraftForm, value: string) => void;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">{label}{required && <span className="text-[var(--accent)]"> *</span>}</span>
      <input {...props} name={name} value={value} required={required} onChange={(event) => onChange(name, event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base outline-none transition placeholder:text-white/25 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]" />
    </label>
  );
}

export function SmartIntake() {
  const [form, setForm] = useState<IntakeDraftForm | null>(null);
  const [photos, setPhotos] = useState<IntakePhoto[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("restoring");
  const [message, setMessage] = useState("Restoring your last draft…");
  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<{ productId: string } | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    void loadLocalDraft().then(async (saved) => {
      if (!active) return;
      const restoredForm = saved?.form ?? emptyDraft();
      const restoredPhotos = saved?.photos ?? [];
      for (const photo of restoredPhotos) {
        if (!photo.previewUrl && photo.storagePath) photo.previewUrl = await getPhotoPreview(photo.storagePath).catch(() => "");
      }
      if (!active) return;
      setForm(restoredForm);
      setPhotos(restoredPhotos);
      setSaveState(saved ? "local" : "synced");
      setMessage(saved ? "Draft restored from this device" : "Ready");
      hydrated.current = true;
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!form || !hydrated.current || completed) return;
    const localTimer = window.setTimeout(() => {
      void saveLocalDraft(form, photos).then(() => {
        setSaveState((state) => state === "saving" ? state : "local");
        setMessage((current) => current.startsWith("Sync") ? current : "Saved on this device");
      }).catch(() => {
        setSaveState("error");
        setMessage("This device could not save the draft");
      });
    }, 200);
    const remoteTimer = window.setTimeout(() => {
      setSaveState("saving");
      setMessage("Syncing draft…");
      void saveRemoteDraft(form, photos).then((synced) => {
        setPhotos((current) => current.map((photo) => {
          const match = synced.find((item) => item.id === photo.id);
          return match?.storagePath === photo.storagePath ? photo : match ?? photo;
        }));
        setSaveState("synced");
        setMessage("Draft synced");
      }).catch((error: unknown) => {
        setSaveState("local");
        setMessage(error instanceof Error ? error.message : "Saved on device; sync unavailable");
      });
    }, 1000);
    return () => { window.clearTimeout(localTimer); window.clearTimeout(remoteTimer); };
  }, [form, photos, completed]);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setPhotos((current) => {
      const available = MAX_PHOTOS - current.length;
      const next = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, available).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        file,
        previewUrl: URL.createObjectURL(file),
        syncState: "local" as const,
      }));
      return [...current, ...next];
    });
    setValidationError("");
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      void removeRemotePhoto(photo?.storagePath);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const replacePhoto = useCallback((id: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file?.type.startsWith("image/")) return;
    setPhotos((current) => current.map((photo) => {
      if (photo.id !== id) return photo;
      if (photo.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
      void removeRemotePhoto(photo.storagePath);
      return { ...photo, name: file.name, type: file.type, size: file.size, file, previewUrl: URL.createObjectURL(file), storagePath: undefined, syncState: "local" };
    }));
  }, []);

  const movePhoto = useCallback((from: number, to: number) => {
    if (to < 0) return;
    setPhotos((current) => {
      if (to >= current.length || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const updateField = useCallback((name: keyof IntakeDraftForm, value: string) => {
    setForm((current) => current ? { ...current, [name]: value } : current);
    setValidationError("");
  }, []);

  const continueToReview = () => {
    if (!photos.length) {
      setValidationError("Add at least one photo to continue.");
      return;
    }
    setForm((current) => current ? { ...current, step: "review" } : current);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finalize = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.acquisitionCost.trim() || !form.askingPrice.trim()) {
      setValidationError("Complete the product name, item cost, and asking price.");
      return;
    }
    if (Number(form.acquisitionCost) < 0 || Number(form.askingPrice) < 0) {
      setValidationError("Prices cannot be negative.");
      return;
    }
    setSubmitting(true);
    setValidationError("");
    try {
      const synced = await saveRemoteDraft(form, photos);
      setPhotos(synced);
      const result = await finalizeRemoteDraft(form.id);
      await clearLocalDraft();
      setCompleted({ productId: result.product_id });
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Could not create the inventory draft. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    photos.forEach((photo) => { if (photo.previewUrl.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl); });
    setForm(emptyDraft());
    setPhotos([]);
    setCompleted(null);
    setSaveState("synced");
    setMessage("Ready");
  };

  if (!form || saveState === "restoring") return <div className="grid min-h-[55dvh] place-items-center"><div className="text-center"><span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent)]"/><p className="mt-4 text-sm text-[var(--muted)]">Restoring your intake draft…</p></div></div>;

  if (completed) return (
    <section className="mx-auto max-w-xl py-10 text-center" aria-live="polite">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--accent)] text-3xl text-black shadow-[0_0_45px_var(--accent-glow)]">✓</div>
      <p className="mt-7 text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Draft created</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">The product is in your pipeline.</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Product, inventory unit, photos, and Facebook listing were saved as drafts. Nothing was posted.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href="/inventory" className="rounded-2xl bg-[var(--accent)] px-5 py-4 font-bold text-black">View inventory</Link><button type="button" onClick={startAnother} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-semibold">Add another</button></div>
    </section>
  );

  return (
    <div onPointerDown={(event) => { if (event.target === event.currentTarget) (document.activeElement as HTMLElement | null)?.blur(); }}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Smart Intake · {form.step === "photos" ? "Photos" : "Review"}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{form.step === "photos" ? "Show us what you found." : "Review the product."}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{form.step === "photos" ? "Add 1–5 clear angles. The first photo becomes the lead image; you can replace or reorder any photo." : "No AI guesses yet—enter only what you know. This creates editable drafts, not a live marketplace post."}</p></div>
        <div className="hidden shrink-0 text-right sm:block" role="status"><p className={`text-xs font-semibold ${saveState === "error" ? "text-red-300" : "text-[var(--accent)]"}`}>{saveState === "saving" ? "● Saving" : saveState === "synced" ? "✓ Synced" : "✓ On device"}</p><p className="mt-1 max-w-56 text-xs text-[var(--muted)]">{message}</p></div>
      </div>

      <div className="mb-5 flex items-center gap-2" aria-label="Intake progress"><span className="h-1.5 flex-1 rounded-full bg-[var(--accent)]"/><span className={`h-1.5 flex-1 rounded-full ${form.step === "review" ? "bg-[var(--accent)]" : "bg-white/10"}`}/></div>

      {form.step === "photos" ? (
        <section className="surface rounded-[2rem] p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {photos.map((photo, index) => <PhotoCard key={photo.id} photo={photo} index={index} count={photos.length} onRemove={removePhoto} onReplace={replacePhoto} onMove={movePhoto} />)}
            {photos.length < MAX_PHOTOS && <label className="group flex aspect-[4/5] min-w-0 cursor-pointer flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-white/20 bg-white/[.025] p-4 text-center transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 focus-within:border-[var(--accent)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"><span className="grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-3xl font-light text-black shadow-[0_0_30px_var(--accent-glow)]">+</span><span className="mt-4 text-sm font-semibold">Add {photos.length ? "another" : "photos"}</span><span className="mt-1 text-xs leading-5 text-[var(--muted)]">Camera or photo library<br/>{photos.length}/{MAX_PHOTOS}</span><input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }}/></label>}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Tip: include the front, label/model details, condition issues, and included accessories. On desktop, drag photos to reorder.</p>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form className="surface rounded-[2rem] p-5 sm:p-7" onSubmit={(event) => { event.preventDefault(); void finalize(); }}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Product name" name="name" value={form.name} onChange={updateField} required autoComplete="off" placeholder="What is it?" /></div>
              <Field label="Brand" name="brand" value={form.brand} onChange={updateField} autoComplete="organization" placeholder="Optional" />
              <Field label="Category" name="category" value={form.category} onChange={updateField} placeholder="e.g. Tools" />
              <Field label="Size / model" name="size" value={form.size} onChange={updateField} placeholder="Optional" />
              <Field label="Color" name="color" value={form.color} onChange={updateField} placeholder="Optional" />
              <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Condition</span><select value={form.condition} onChange={(event) => updateField("condition", event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#111319] px-4 text-base outline-none focus:border-[var(--accent)]"><option value="">Choose condition</option><option>New</option><option>Like new</option><option>Good</option><option>Fair</option><option>For parts</option></select></label>
              <Field label="Item cost" name="acquisitionCost" value={form.acquisitionCost} onChange={updateField} required type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" />
              <Field label="Asking price" name="askingPrice" value={form.askingPrice} onChange={updateField} required type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" />
              <div className="sm:col-span-2"><Field label="Storage location" name="storageLocation" value={form.storageLocation} onChange={updateField} placeholder="Optional — shelf, bin, or room" /></div>
              <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Description / notes</span><textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={5} placeholder="Condition details, included parts, measurements…" className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base leading-6 outline-none transition placeholder:text-white/25 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]"/></label>
            </div>
            <button type="submit" disabled={submitting} className="mt-7 min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-bold text-black shadow-[0_0_35px_var(--accent-glow)] transition active:scale-[.99] disabled:cursor-wait disabled:opacity-60">{submitting ? "Creating drafts…" : "Create inventory draft"}</button>
          </form>
          <aside className="surface h-fit rounded-[2rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted)]">Photo order</p>
            <div className="mt-4 grid grid-cols-5 gap-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <button type="button" key={photo.id} aria-label={`Return to edit photo ${index + 1}`} onClick={() => setForm((current) => current ? { ...current, step: "photos" } : current)} className="relative aspect-square overflow-hidden rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${photo.previewUrl})` }}>
                  <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-black/70 text-[10px]">{index + 1}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setForm((current) => current ? { ...current, step: "photos" } : current)} className="mt-4 min-h-11 w-full rounded-xl border border-white/10 text-sm font-semibold">Edit photos</button>
            <div className="mt-5 border-t border-white/8 pt-5 text-xs leading-5 text-[var(--muted)]"><p className="font-semibold text-white">What happens next</p><p className="mt-1">One product, one physical inventory unit, and one Facebook listing are created with DRAFT status.</p></div>
          </aside>
        </section>
      )}

      {validationError && <div role="alert" className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{validationError}</div>}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[var(--panel)]/95 p-3 backdrop-blur-xl sm:p-4" role="status">
        <div className="min-w-0"><p className="text-xs font-semibold text-white">{saveState === "saving" ? "Saving…" : saveState === "synced" ? "Draft synced" : "Draft safe on this device"}</p><p className="truncate text-[11px] text-[var(--muted)]">{message}</p></div>
        {form.step === "photos" ? <button type="button" onClick={continueToReview} disabled={!photos.length} className="min-h-12 shrink-0 rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-black shadow-[0_0_25px_var(--accent-glow)] disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none">Continue</button> : <button type="button" onClick={() => setForm((current) => current ? { ...current, step: "photos" } : current)} className="min-h-12 shrink-0 rounded-2xl border border-white/10 px-5 text-sm font-semibold">Back</button>}
      </div>
    </div>
  );
}
