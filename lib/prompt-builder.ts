import type { GenerationMode } from "@/lib/contracts";
import { getThemePreset } from "@/lib/theme-presets";

interface BuildGenerationPromptOptions {
  mode: GenerationMode;
  themeId: string;
  notes?: string;
  listingTitle?: string;
}

export function buildGenerationPrompt({
  mode,
  themeId,
  notes,
  listingTitle,
}: BuildGenerationPromptOptions) {
  const theme = getThemePreset(themeId);

  const sharedRules = [
    "Create a photorealistic real-estate style visualization from the supplied property photo.",
    "Preserve the existing architecture, permanent room layout, ceiling height, windows, door openings, camera position, and daylight direction.",
    "Keep the result believable and high-end, like a premium renovation concept or expertly staged listing photo.",
    "Do not change the exterior scenery visible through windows and do not introduce impossible structural edits.",
  ];

  const modeInstruction =
    mode === "redesign"
      ? [
          "This is a renovation-style redesign request.",
          theme.redesignPrompt,
          "Update surfaces, finishes, fixtures, lighting, millwork, flooring, cabinetry, decor, and styling as needed while preserving the room geometry.",
          "If furniture is present, restyle it or replace it so the room looks fully refreshed in the requested aesthetic.",
        ]
      : [
          "This is a virtual staging request.",
          theme.stagingPrompt,
          "Focus on adding or replacing furniture, rugs, artwork, lighting, greenery, and accessories while preserving the base shell of the room.",
          "The furniture plan should feel appropriate to the room size and camera angle, with realistic spacing and proportions.",
        ];

  const contextNotes = [
    listingTitle ? `Property context: ${listingTitle}.` : null,
    notes ? `Additional guidance from the user: ${notes}.` : null,
    `Style target: ${theme.label} with a ${theme.descriptor} feeling.`,
    "Output a single finished image that looks natural, detailed, and marketable.",
  ].filter(Boolean);

  return [...sharedRules, ...modeInstruction, ...contextNotes].join("\n");
}
