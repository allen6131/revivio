"use client";

import { useState, useTransition } from "react";
import type {
  GenerateImageResponse,
  GenerationMode,
  ListingImportResult,
} from "@/lib/contracts";
import { getModeLabel, THEME_PRESETS } from "@/lib/theme-presets";
import { createId, getErrorMessage } from "@/lib/utils";

interface ConceptHistoryItem extends GenerateImageResponse {
  id: string;
  sourceImageUrl: string;
  themeId: string;
  notes: string;
}

const SAMPLE_PLACEHOLDER =
  "https://www.zillow.com/homedetails/123-Main-St-Anytown-USA/12345678_zpid/";
const MAX_UPLOADS = 8;

const MODE_OPTIONS: Array<{
  id: GenerationMode;
  title: string;
  description: string;
}> = [
  {
    id: "redesign",
    title: "Redesign the room",
    description:
      "Update finishes, cabinetry, lighting, materials, and styling while keeping the architecture believable.",
  },
  {
    id: "stage",
    title: "Stage with furniture",
    description:
      "Virtually furnish the space in your chosen aesthetic for a listing-ready presentation.",
  },
];

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "The request failed.");
  }

  return payload;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected image."));
    };

    reader.onerror = () => {
      reject(new Error("Unable to read the selected image."));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to prepare the uploaded image."));
    image.src = dataUrl;
  });
}

async function normalizeUploadedImage(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  if (scale === 1 && file.size < 3_500_000) {
    return originalDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return originalDataUrl;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function RevivioStudio() {
  const [listingUrl, setListingUrl] = useState("");
  const [listing, setListing] = useState<ListingImportResult | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [mode, setMode] = useState<GenerationMode>("redesign");
  const [themeId, setThemeId] = useState(THEME_PRESETS[0].id);
  const [notes, setNotes] = useState("");
  const [concepts, setConcepts] = useState<ConceptHistoryItem[]>([]);
  const [listingError, setListingError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isImportPending, startImportTransition] = useTransition();
  const [isGeneratePending, startGenerateTransition] = useTransition();
  const [isUploadPending, startUploadTransition] = useTransition();

  const selectedImage = listing?.images.find((image) => image.id === selectedImageId) ?? null;

  function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setListingError(null);
    setGenerationError(null);

    startImportTransition(async () => {
      try {
        const response = await fetch("/api/listing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: listingUrl }),
        });

        const payload = await readJson<ListingImportResult>(response);
        setListing(payload);
        setSelectedImageId(payload.images[0]?.id ?? null);
        setConcepts([]);
      } catch (error) {
        setListing(null);
        setSelectedImageId(null);
        setListingError(getErrorMessage(error));
      }
    });
  }

  function handleManualUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_UPLOADS);

    if (files.length === 0) {
      return;
    }

    setListingError(null);
    setGenerationError(null);

    startUploadTransition(async () => {
      try {
        const images = await Promise.all(
          files.map(async (file) => {
            const normalizedDataUrl = await normalizeUploadedImage(file);

            return {
              id: createId("upload"),
              url: normalizedDataUrl,
              dataUrl: normalizedDataUrl,
              source: file.name,
            };
          }),
        );

        setListing({
          title: "Uploaded room photos",
          subtitle:
            "Use listing screenshots or saved room photos when the original property site blocks automated access.",
          sourceUrl: "",
          images,
          warnings: [
            "These room images came from manual uploads instead of automated listing import.",
          ],
        });
        setSelectedImageId(images[0]?.id ?? null);
        setConcepts([]);
      } catch (error) {
        setListingError(getErrorMessage(error));
      } finally {
        event.target.value = "";
      }
    });
  }

  function handleGenerate() {
    if (!listing || !selectedImage) {
      return;
    }

    setGenerationError(null);

    startGenerateTransition(async () => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceImageUrl: selectedImage.dataUrl ? undefined : selectedImage.url,
            sourceImageDataUrl: selectedImage.dataUrl,
            sourceUrl: listing.sourceUrl,
            listingTitle: listing.title,
            themeId,
            mode,
            notes,
          }),
        });

        const payload = await readJson<GenerateImageResponse>(response);
        setConcepts((current) => [
          {
            ...payload,
            id: createId("concept"),
            sourceImageUrl: selectedImage.url,
            themeId,
            notes,
          },
          ...current,
        ]);
      } catch (error) {
        setGenerationError(getErrorMessage(error));
      }
    });
  }

  return (
    <main className="studio-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">AI Listing Reimaginer</span>
          <h1 className="hero-title">Revivio turns Zillow photos into fresh design concepts.</h1>
          <p className="hero-text">
            Paste a public Zillow listing, pull the room photos into a workspace, then
            generate realistic before-and-after redesigns or virtual furniture staging in
            styles like modern, contemporary, Japandi, or coastal.
          </p>
          <div className="hero-badges">
            <span className="pill">Zillow photo import</span>
            <span className="pill">AI redesign concepts</span>
            <span className="pill">Virtual staging</span>
            <span className="pill">Vercel-ready Next.js app</span>
          </div>
        </div>

        <div className="hero-grid">
          <article className="stat-card">
            <span className="stat-label">Workflow</span>
            <p className="stat-value">Paste listing, choose a room, generate a refreshed vision.</p>
          </article>
          <article className="stat-card">
            <span className="stat-label">Modes</span>
            <p className="stat-value">Architectural redesigns and virtual staging from one photo.</p>
          </article>
          <article className="stat-card">
            <span className="stat-label">Output</span>
            <p className="stat-value">Premium, photorealistic images built for seller and buyer imagination.</p>
          </article>
        </div>
      </section>

      <section className="main-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2 className="section-title">Import Listing</h2>
              <p className="section-text">
                Start with a Zillow listing when it works, then fall back to uploaded room
                screenshots whenever the source site blocks automated access.
              </p>
            </div>
            <span className="status-chip">
              {listing ? `${listing.images.length} photo${listing.images.length === 1 ? "" : "s"}` : "Waiting for URL"}
            </span>
          </div>

          <form className="form-stack" onSubmit={handleImport}>
            <label className="label">
              <span>Zillow listing URL</span>
              <input
                className="input"
                type="url"
                placeholder={SAMPLE_PLACEHOLDER}
                value={listingUrl}
                onChange={(event) => setListingUrl(event.target.value)}
                required
              />
              <p className="hint">
                Public Zillow pages work best. Individual listings can occasionally block
                automated photo extraction.
              </p>
            </label>

            <div className="button-row">
              <button className="button-primary" disabled={isImportPending} type="submit">
                {isImportPending ? "Importing photos..." : "Pull listing photos"}
              </button>
              <button
                className="button-secondary"
                disabled={isImportPending}
                type="button"
                onClick={() => setListingUrl(SAMPLE_PLACEHOLDER)}
              >
                Use sample format
              </button>
            </div>

            <div className="message message-info">
              If the listing blocks automated access, upload one or more saved listing
              screenshots or room photos instead.
            </div>

            <label className="label">
              <span>Manual room image fallback</span>
              <input
                className="input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleManualUpload}
              />
              <p className="hint">
                Upload up to {MAX_UPLOADS} room photos. Revivio will resize them in the
                browser and use them exactly like imported listing images.
              </p>
            </label>

            {listingError ? <div className="message message-error">{listingError}</div> : null}

            {listing?.warnings.length ? (
              <div className="message message-info">
                Import notes
                <ul>
                  {listing.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>

          {listing ? (
            <div className="workspace-grid" style={{ marginTop: 22 }}>
              <article className="gallery-card">
                <div className="listing-meta">
                  <h3 className="listing-title">{listing.title}</h3>
                  {listing.subtitle ? (
                    <p className="listing-subtitle">{listing.subtitle}</p>
                  ) : null}
                  {listing.sourceUrl ? (
                    <a
                      className="listing-subtitle"
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source listing
                    </a>
                  ) : (
                    <p className="listing-subtitle">Uploaded directly from your device.</p>
                  )}
                </div>

                <div className="gallery-grid">
                  {listing.images.map((image, index) => (
                    <button
                      key={image.id}
                      className={`gallery-button ${image.id === selectedImageId ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setSelectedImageId(image.id)}
                    >
                      <img
                        className="gallery-image"
                        src={image.url}
                        alt={`Imported listing room ${index + 1}`}
                        loading="lazy"
                      />
                      <div className="gallery-caption">
                        Photo {index + 1} · {image.source}
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2 className="section-title">Design Studio</h2>
              <p className="section-text">
                Pick the transformation mode, set the visual theme, and guide the result
                with room-specific notes.
              </p>
            </div>
            <span className="status-chip">
              {selectedImage ? "Room selected" : "Choose a room"}
            </span>
          </div>

          <div className="control-stack">
            <div className="mode-grid">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`toggle-button ${mode === option.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setMode(option.id)}
                >
                  <span className="toggle-title">{option.title}</span>
                  <span className="toggle-text">{option.description}</span>
                </button>
              ))}
            </div>

            <div className="theme-grid">
              {THEME_PRESETS.map((theme) => (
                <button
                  key={theme.id}
                  className={`theme-button ${theme.id === themeId ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setThemeId(theme.id)}
                >
                  <span className="theme-title">{theme.label}</span>
                  <span className="theme-text">{theme.summary}</span>
                </button>
              ))}
            </div>

            <label className="label">
              <span>Extra direction for the AI</span>
              <textarea
                className="textarea"
                placeholder="Example: Make this kitchen feel warmer with white oak cabinetry, brushed brass, a large island pendant, and family-friendly seating."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <p className="hint">
                Mention the room type, renovation priorities, furnishings to add, or
                details to avoid.
              </p>
            </label>

            <div className="button-row">
              <button
                className="button-primary"
                disabled={!selectedImage || isGeneratePending || isUploadPending}
                type="button"
                onClick={handleGenerate}
              >
                {isGeneratePending
                  ? "Generating concept..."
                  : `${getModeLabel(mode)} in ${THEME_PRESETS.find((theme) => theme.id === themeId)?.label}`}
              </button>
            </div>

            {generationError ? (
              <div className="message message-error">{generationError}</div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Generated Concepts</h2>
            <p className="section-text">
              Each concept keeps the room shell grounded in the source photo while
              exploring a new presentation for the property.
            </p>
          </div>
          <span className="status-chip">
            {concepts.length === 0 ? "No concepts yet" : `${concepts.length} concept${concepts.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {concepts.length === 0 ? (
          <div className="message message-info">
            Import a listing and generate a redesign or staging concept to populate this
            gallery.
          </div>
        ) : (
          <div className="results-stack">
            {concepts.map((concept) => (
              <article className="result-card" key={concept.id}>
                <div className="result-topline">
                  <div>
                    <h3 className="result-title">
                      {concept.themeLabel} · {getModeLabel(concept.mode)}
                    </h3>
                    <p className="result-copy">
                      Created {new Date(concept.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="status-chip">{concept.notes ? "With custom notes" : "Theme preset only"}</span>
                </div>

                <div className="comparison-grid">
                  <figure className="comparison-panel">
                    <img
                      className="comparison-image"
                      src={concept.sourceImageUrl}
                      alt="Source room image"
                    />
                    <figcaption>
                      <strong>Source room image</strong>
                      <span>Imported from the listing or uploaded manually.</span>
                    </figcaption>
                  </figure>

                  <figure className="comparison-panel">
                    <img
                      className="result-image"
                      src={concept.imageDataUrl}
                      alt={`${concept.themeLabel} generated concept`}
                    />
                    <figcaption>
                      <strong>Revivio concept</strong>
                      <span>{concept.themeLabel} vision for the same room.</span>
                    </figcaption>
                  </figure>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="features-grid">
        <article className="feature-card">
          <h3>Listing-native workflow</h3>
          <p>
            The user starts with a Zillow URL, not a blank canvas, so the experience fits
            the way buyers, sellers, stagers, and agents already think.
          </p>
        </article>
        <article className="feature-card">
          <h3>Two high-value outcomes</h3>
          <p>
            Renovation-style redesigns help buyers imagine potential, while virtual
            staging helps empty rooms feel finished and emotionally legible.
          </p>
        </article>
        <article className="feature-card">
          <h3>Built for Vercel</h3>
          <p>
            This app uses the Next.js App Router with server routes, which makes it a
            clean fit for Vercel deployment and future product iteration.
          </p>
        </article>
      </section>

      <p className="footer-note">
        Add <code>OPENAI_API_KEY</code> in your environment before generating images.
        The listing import and manual upload fallback both work without it.
      </p>
    </main>
  );
}
