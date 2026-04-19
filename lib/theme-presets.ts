import type { GenerationMode } from "@/lib/contracts";

export interface ThemePreset {
  id: string;
  label: string;
  descriptor: string;
  summary: string;
  redesignPrompt: string;
  stagingPrompt: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "modern",
    label: "Modern",
    descriptor: "clean-lined modern luxury",
    summary: "Sculptural furnishings, warm neutrals, and premium contemporary finishes.",
    redesignPrompt:
      "Update the space with refined modern finishes, slim architectural detailing, stone or plaster texture moments, and a warm gallery-like palette.",
    stagingPrompt:
      "Stage the room with clean-lined modern furniture, sculptural lighting, restrained decor, layered textiles, and a luxurious but livable layout.",
  },
  {
    id: "contemporary",
    label: "Contemporary",
    descriptor: "current editorial contemporary design",
    summary: "Fresh, design-forward styling with layered materials and soft contrast.",
    redesignPrompt:
      "Refresh the home with design-forward contemporary finishes, mixed natural materials, softly curved forms, and lighting that feels current and elevated.",
    stagingPrompt:
      "Stage the room with contemporary furniture, artful accent chairs, layered rugs, and a layout that feels magazine-ready without being overdone.",
  },
  {
    id: "organic-modern",
    label: "Organic Modern",
    descriptor: "organic modern calm",
    summary: "Soft oak, plaster tones, tactile fabrics, and serene natural styling.",
    redesignPrompt:
      "Rework the room with pale oak, limewash or plaster-inspired finishes, soft edge profiles, earthy stone, and a calm tonal palette.",
    stagingPrompt:
      "Stage the room with organic modern furniture, curved silhouettes, natural wood, boucle or linen upholstery, and quiet biophilic touches.",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    descriptor: "light Scandinavian simplicity",
    summary: "Airy woods, crisp daylight, and practical minimal warmth.",
    redesignPrompt:
      "Redesign the space with bright Scandinavian simplicity, pale timber, matte finishes, daylight-enhancing surfaces, and understated craftsmanship.",
    stagingPrompt:
      "Stage the room with Scandinavian furnishings, functional storage, light oak accents, simple textiles, and cozy but uncluttered styling.",
  },
  {
    id: "japandi",
    label: "Japandi",
    descriptor: "Japandi restraint",
    summary: "Minimal, intentional interiors with low contrast and natural harmony.",
    redesignPrompt:
      "Transform the room using Japandi cues like quiet material transitions, low visual clutter, natural oak or ash, charcoal accents, and balanced negative space.",
    stagingPrompt:
      "Stage with Japandi furniture, low silhouettes, ceramic accents, intentional emptiness, and warm natural textures.",
  },
  {
    id: "coastal",
    label: "Coastal",
    descriptor: "elevated coastal retreat",
    summary: "Sun-washed finishes, sandy textures, and relaxed premium styling.",
    redesignPrompt:
      "Refresh the home with elevated coastal finishes, airy whites, pale woods, relaxed stone textures, and subtle ocean-inspired tones.",
    stagingPrompt:
      "Stage the room with airy coastal furniture, soft slipcovered seating, woven accents, and a relaxed resort-like arrangement.",
  },
  {
    id: "luxury",
    label: "Luxury",
    descriptor: "high-end residential luxury",
    summary: "Rich materiality, statement lighting, and polished aspirational living.",
    redesignPrompt:
      "Upgrade the space with high-end residential luxury details, sophisticated millwork, bespoke lighting, premium stone, and rich material contrast.",
    stagingPrompt:
      "Stage the room with upscale furniture, layered lighting, curated accessories, and a layout that feels premium enough for a flagship listing.",
  },
  {
    id: "warm-minimal",
    label: "Warm Minimal",
    descriptor: "warm minimalist serenity",
    summary: "Minimal clutter, creamy tones, and comfort-first simplicity.",
    redesignPrompt:
      "Update the space with warm minimalist finishes, creamy tones, low-contrast surfaces, reduced visual noise, and comfort-driven detailing.",
    stagingPrompt:
      "Stage the room with warm minimalist furniture, soft textures, simple silhouettes, and only the most necessary decor.",
  },
];

export function getThemePreset(themeId: string) {
  return THEME_PRESETS.find((theme) => theme.id === themeId) ?? THEME_PRESETS[0];
}

export function getModeLabel(mode: GenerationMode) {
  return mode === "redesign" ? "Redesign" : "Stage";
}
