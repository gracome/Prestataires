import { NextResponse } from "next/server";
import { getFile, StorageError } from "@/lib/storage";

/**
 * GET /api/media/{key}
 *
 * Serves public site media: logos, cover photos and gallery images. These are
 * meant to be seen by anyone visiting the provider's site, so unlike a payment
 * proof they need no authorisation and are cached aggressively.
 *
 * The `proofs/` prefix is refused outright: private files have their own
 * authorised route and must never be reachable from here.
 */

export const dynamic = "force-static";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key } = await context.params;
  const storageKey = key.join("/");

  if (!storageKey.startsWith("media/")) {
    return new NextResponse("Introuvable", { status: 404 });
  }

  try {
    const file = await getFile(storageKey);

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "content-type": file.mimeType,
        "content-length": String(file.bytes.byteLength),
        // Keys contain a UUID, so a given URL always returns the same bytes.
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StorageError && error.code === "NOT_FOUND") {
      return new NextResponse("Introuvable", { status: 404 });
    }
    throw error;
  }
}
