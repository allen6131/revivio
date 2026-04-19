import { load } from "cheerio";
import type { ListingImage, ListingImportResult } from "@/lib/contracts";

const ROOM_IMAGE_PATTERN =
  /https?:\/\/[^"'\\\s<>()]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>()]*)?/gi;

const ZILLOW_IMAGE_HINT = "photos.zillowstatic.com";

function normalizeUrlCandidate(candidate: string) {
  const cleaned = candidate
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/^["']|["']$/g, "")
    .trim();

  try {
    const parsed = new URL(cleaned);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function scoreImage(url: string) {
  let score = 0;

  if (url.includes(ZILLOW_IMAGE_HINT)) {
    score += 6;
  }

  if (/fp\/|cc_ft_1536|cc_ft_1344|1536|1344|1280|960/i.test(url)) {
    score += 3;
  }

  if (/logo|icon|sprite|avatar|profile|map|staticmap|placeholder/i.test(url)) {
    score -= 8;
  }

  return score;
}

function walkJson(value: unknown, collector: Map<string, string>, source: string) {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    const normalized = normalizeUrlCandidate(value);

    if (normalized && ROOM_IMAGE_PATTERN.test(normalized)) {
      collector.set(normalized, source);
    }

    ROOM_IMAGE_PATTERN.lastIndex = 0;
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, collector, source));
    return;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => walkJson(item, collector, source));
  }
}

function collectMatches(input: string, collector: Map<string, string>, source: string) {
  const decoded = input.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");

  for (const match of decoded.matchAll(ROOM_IMAGE_PATTERN)) {
    const normalized = normalizeUrlCandidate(match[0]);

    if (normalized) {
      collector.set(normalized, source);
    }
  }
}

function selectImages(collector: Map<string, string>) {
  const ranked = [...collector.entries()]
    .filter(([url]) => !url.endsWith(".svg"))
    .sort((a, b) => scoreImage(b[0]) - scoreImage(a[0]));

  const zillowOnly = ranked.filter(([url]) => url.includes(ZILLOW_IMAGE_HINT));
  const chosen = (zillowOnly.length > 0 ? zillowOnly : ranked).slice(0, 12);

  return chosen.map<ListingImage>(([url, source], index) => ({
    id: `listing-image-${index + 1}`,
    url,
    source,
  }));
}

function cleanTitle(input: string | undefined) {
  if (!input) {
    return "Imported listing";
  }

  return input
    .replace(/\s+\|\s+Zillow.*$/i, "")
    .replace(/\s+-\s+Zillow.*$/i, "")
    .trim();
}

function cleanSubtitle(input: string | undefined) {
  if (!input) {
    return null;
  }

  const cleaned = input.trim();
  return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned;
}

export async function importListingFromUrl(listingUrl: string): Promise<ListingImportResult> {
  let normalizedListingUrl: URL;

  try {
    normalizedListingUrl = new URL(listingUrl);
  } catch {
    throw new Error("Please paste a valid Zillow listing URL.");
  }

  if (!["http:", "https:"].includes(normalizedListingUrl.protocol)) {
    throw new Error("Only public http(s) listing URLs are supported.");
  }

  const response = await fetch(normalizedListingUrl.toString(), {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(18000),
  });

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "This listing blocked automated access. Upload screenshots or saved room photos instead."
        : `Unable to fetch that listing right now (${response.status}).`,
    );
  }

  const html = await response.text();
  const $ = load(html);
  const collector = new Map<string, string>();

  collectMatches(html, collector, "html");

  $("meta[property='og:image'], meta[name='twitter:image']").each((_, element) => {
    const candidate = $(element).attr("content");
    const normalized = candidate ? normalizeUrlCandidate(candidate) : null;

    if (normalized) {
      collector.set(normalized, "meta");
    }
  });

  $("script[type='application/ld+json']").each((_, element) => {
    try {
      const payload = JSON.parse($(element).text());
      walkJson(payload, collector, "json-ld");
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  });

  $("script").each((_, element) => {
    const script = $(element).html();

    if (script) {
      collectMatches(script, collector, "script");
    }
  });

  const images = selectImages(collector);
  const title = cleanTitle(
    $("meta[property='og:title']").attr("content") ||
      $("h1").first().text() ||
      $("title").first().text(),
  );
  const subtitle = cleanSubtitle(
    $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content"),
  );
  const warnings: string[] = [];

  if (images.length === 0) {
    warnings.push(
      "No room photos were extracted from this page. Zillow occasionally blocks automated scraping on individual listings.",
    );
  } else if (!images.some((image) => image.url.includes(ZILLOW_IMAGE_HINT))) {
    warnings.push("Photos were extracted, but they did not appear to come from Zillow's main photo CDN.");
  }

  return {
    title,
    subtitle,
    sourceUrl: normalizedListingUrl.toString(),
    images,
    warnings,
  };
}
