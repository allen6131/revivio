import { NextResponse } from "next/server";
import { importListingFromUrl } from "@/lib/listing-parser";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { url?: string };

    if (!payload.url?.trim()) {
      return NextResponse.json(
        { error: "A Zillow listing URL is required." },
        { status: 400 },
      );
    }

    const listing = await importListingFromUrl(payload.url);
    return NextResponse.json(listing);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
