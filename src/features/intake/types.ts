export type IntakeStep = "photos" | "review";

export type IntakeDraftForm = {
  id: string;
  step: IntakeStep;
  name: string;
  brand: string;
  category: string;
  size: string;
  color: string;
  condition: string;
  description: string;
  acquisitionCost: string;
  askingPrice: string;
  storageLocation: string;
};

export type IntakePhoto = {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl: string;
  file?: File;
  storagePath?: string;
  syncState: "local" | "uploading" | "saved" | "error";
};

export function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export const emptyDraft = (): IntakeDraftForm => ({
  id: createUuid(),
  step: "photos",
  name: "",
  brand: "",
  category: "",
  size: "",
  color: "",
  condition: "",
  description: "",
  acquisitionCost: "",
  askingPrice: "",
  storageLocation: "",
});
