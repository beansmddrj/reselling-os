import { createClient } from "@/lib/supabase/client";
import type { IntakeDraftForm, IntakePhoto } from "@/features/intake/types";

const BUCKET = "intake-photos";

function moneyToCents(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "") || "photo.jpg";
}

export async function saveRemoteDraft(form: IntakeDraftForm, photos: IntakePhoto[]) {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in to sync this draft. It is still saved on this device.");

  const syncedPhotos: IntakePhoto[] = [];
  for (const photo of photos) {
    if (photo.storagePath || !photo.file) {
      syncedPhotos.push(photo);
      continue;
    }
    const storagePath = `${auth.user.id}/${form.id}/${photo.id}-${safeFileName(photo.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, photo.file, {
      contentType: photo.type,
      upsert: true,
    });
    if (error) throw new Error(`Could not upload ${photo.name}: ${error.message}`);
    syncedPhotos.push({ ...photo, storagePath, syncState: "saved" });
  }

  const { error } = await supabase.from("intake_drafts").upsert({
    id: form.id,
    owner_id: auth.user.id,
    step: form.step,
    name: form.name,
    brand: form.brand || null,
    category: form.category || null,
    size: form.size || null,
    color: form.color || null,
    condition: form.condition || null,
    description: form.description || null,
    acquisition_cost_cents: moneyToCents(form.acquisitionCost),
    asking_price_cents: moneyToCents(form.askingPrice),
    storage_location: form.storageLocation || null,
    photo_paths: syncedPhotos.flatMap((photo) => photo.storagePath ? [photo.storagePath] : []),
  });
  if (error) throw new Error(`Could not sync draft: ${error.message}`);
  return syncedPhotos;
}

export async function removeRemotePhoto(storagePath?: string) {
  if (!storagePath) return;
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
}

export async function getPhotoPreview(storagePath: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
  if (error) return "";
  return data.signedUrl;
}

export async function finalizeRemoteDraft(draftId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("finalize_intake_draft", { draft_id: draftId });
  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new Error("The draft could not be finalized.");
  return data[0];
}
