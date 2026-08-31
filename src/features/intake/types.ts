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

export const emptyDraft = (): IntakeDraftForm => ({
  id: crypto.randomUUID(),
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
