import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getFile, StorageError } from "@/lib/storage";

/**
 * GET /api/proofs/{id}
 *
 * Serves a payment proof (cahier des charges section 23). Proofs contain
 * banking details and are never reachable from a guessable public URL: the
 * file lives outside the web root and this route checks that the caller is
 * the provider who owns the appointment before streaming a single byte.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const user = await getCurrentUser();
  if (!user?.providerId) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const proof = await prisma.paymentProof.findUnique({
    where: { id },
    select: {
      storageKey: true,
      mimeType: true,
      originalName: true,
      appointment: { select: { providerId: true } },
    },
  });

  // One answer for "does not exist" and "belongs to somebody else", so the
  // route cannot be used to probe which proof ids are real.
  if (!proof || proof.appointment.providerId !== user.providerId) {
    return new NextResponse("Introuvable", { status: 404 });
  }

  try {
    const file = await getFile(proof.storageKey);

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "content-type": file.mimeType,
        "content-length": String(file.bytes.byteLength),
        // `inline` lets the provider glance at the screenshot in the browser;
        // the filename is quoted and stripped so it cannot break the header.
        "content-disposition": `inline; filename="${headerSafe(proof.originalName)}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
        // A proof is never script; stop the browser from treating it as such.
        "content-security-policy": "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof StorageError && error.code === "NOT_FOUND") {
      return new NextResponse("Fichier introuvable", { status: 404 });
    }
    throw error;
  }
}

function headerSafe(name: string): string {
  return name.replace(/[^\w.\- ]/g, "_").slice(0, 100) || "preuve";
}
