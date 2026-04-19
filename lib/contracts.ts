export type GenerationMode = "redesign" | "stage";

export interface ListingImage {
  id: string;
  url: string;
  source: string;
  dataUrl?: string;
}

export interface ListingImportResult {
  title: string;
  subtitle: string | null;
  sourceUrl: string;
  images: ListingImage[];
  warnings: string[];
}

export interface GenerateImageRequest {
  sourceImageUrl?: string;
  sourceImageDataUrl?: string;
  sourceUrl?: string;
  listingTitle?: string;
  themeId: string;
  mode: GenerationMode;
  notes?: string;
}

export interface GenerateImageResponse {
  imageDataUrl: string;
  prompt: string;
  themeLabel: string;
  mode: GenerationMode;
  generatedAt: string;
}
