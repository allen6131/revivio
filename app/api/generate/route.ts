import { NextResponse } from "next/server";
import { toFile } from "openai";
import type { GenerateImageRequest, GenerateImageResponse } from "@/lib/contracts";
import { buildGenerationPrompt } from "@/lib/prompt-builder";
import { getOpenAIClient } from "@/lib/openai";
import { getThemePreset } from "@/lib/theme-presets";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

function imageExtensionFromType(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }

  if (contentType.includes("png")) {
    return "png";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

function uploadedDataUrlToFile(sourceImageDataUrl: string) {
  const match = sourceImageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("The uploaded room image was invalid. Please upload it again.");
  }

  const [, contentType, base64Payload] = match;

  if (!contentType.startsWith("image/")) {
    throw new Error("Only image uploads are supported for manual room imports.");
  }

  const imageBytes = Buffer.from(base64Payload, "base64");

  return toFile(imageBytes, `upload.${imageExtensionFromType(contentType)}`, {
    type: contentType,
  });
}

async function fetchSourceImage(sourceImageUrl: string, sourceUrl?: string) {
  const response = await fetch(sourceImageUrl, {
    cache: "no-store",
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      ...(sourceUrl ? { Referer: sourceUrl } : {}),
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(18000),
  });

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "The source photo could not be downloaded because the host blocked access."
        : `Unable to download the selected room photo (${response.status}).`,
    );
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";

  if (!contentType.startsWith("image/")) {
    throw new Error("The selected listing photo did not return a supported image file.");
  }

  const imageBytes = Buffer.from(await response.arrayBuffer());
  return toFile(imageBytes, `source.${imageExtensionFromType(contentType)}`, {
    type: contentType,
  });
}

async function getSourceImageFile(payload: GenerateImageRequest) {
  if (payload.sourceImageDataUrl?.trim()) {
    return uploadedDataUrlToFile(payload.sourceImageDataUrl);
  }

  if (payload.sourceImageUrl?.trim()) {
    return fetchSourceImage(payload.sourceImageUrl, payload.sourceUrl);
  }

  throw new Error("Select or upload a room photo before generating a concept.");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GenerateImageRequest;

    if (!payload.sourceImageUrl?.trim() && !payload.sourceImageDataUrl?.trim()) {
      return NextResponse.json(
        { error: "Select a room photo before generating a concept." },
        { status: 400 },
      );
    }

    if (!payload.themeId?.trim()) {
      return NextResponse.json({ error: "Choose a design theme first." }, { status: 400 });
    }

    if (!payload.mode || !["redesign", "stage"].includes(payload.mode)) {
      return NextResponse.json({ error: "Choose redesign or staging." }, { status: 400 });
    }

    const prompt = buildGenerationPrompt({
      mode: payload.mode,
      themeId: payload.themeId,
      notes: payload.notes,
      listingTitle: payload.listingTitle,
    });

    const sourceImage = await getSourceImageFile(payload);
    const result = await getOpenAIClient().images.edit({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
      image: sourceImage,
      prompt,
      input_fidelity: "high",
      quality: "high",
      size: "auto",
      output_format: "jpeg",
      background: "opaque",
    });

    const generated = result.data?.[0]?.b64_json;

    if (!generated) {
      throw new Error("The image model completed, but no output image was returned.");
    }

    const responsePayload: GenerateImageResponse = {
      imageDataUrl: `data:image/jpeg;base64,${generated}`,
      prompt,
      themeLabel: getThemePreset(payload.themeId).label,
      mode: payload.mode,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Generation failed", error);

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
