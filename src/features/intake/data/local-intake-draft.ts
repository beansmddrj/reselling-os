import type { IntakeDraftForm, IntakePhoto } from "@/features/intake/types";

const DRAFT_KEY = "reselling-os:intake-draft:v1";
const DB_NAME = "reselling-os-intake";
const STORE_NAME = "photo-files";

type StoredPhoto = Omit<IntakePhoto, "previewUrl" | "file" | "syncState"> & {
  file?: File;
};

type StoredDraft = { form: IntakeDraftForm; photos: StoredPhoto[]; savedAt: string };

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeFiles(photos: IntakePhoto[]) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    photos.forEach((photo) => {
      if (photo.file) store.put(photo.file, photo.id);
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function readFile(database: IDBDatabase, id: string) {
  return new Promise<File | undefined>((resolve) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as File | undefined);
    request.onerror = () => resolve(undefined);
  });
}

export async function saveLocalDraft(form: IntakeDraftForm, photos: IntakePhoto[]) {
  const stored: StoredDraft = {
    form,
    photos: photos.map(({ id, name, type, size, storagePath, file }) => ({
      id,
      name,
      type,
      size,
      storagePath,
      file,
    })),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    ...stored,
    photos: stored.photos.map(({ id, name, type, size, storagePath }) => ({ id, name, type, size, storagePath })),
  }));
  await writeFiles(photos);
}

export async function loadLocalDraft() {
  const value = localStorage.getItem(DRAFT_KEY);
  if (!value) return null;
  try {
    const stored = JSON.parse(value) as StoredDraft;
    const database = await openDatabase();
    const photos: IntakePhoto[] = [];
    for (const photo of stored.photos) {
      const file = await readFile(database, photo.id);
      if (!file && !photo.storagePath) continue;
      photos.push({
        ...photo,
        file,
        previewUrl: file ? URL.createObjectURL(file) : "",
        syncState: photo.storagePath ? "saved" : "local",
      });
    }
    database.close();
    return { form: stored.form, photos };
  } catch {
    return null;
  }
}

export async function clearLocalDraft() {
  localStorage.removeItem(DRAFT_KEY);
  const database = await openDatabase();
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
  database.close();
}
