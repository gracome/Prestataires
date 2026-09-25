import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BookingError, submitPaymentProof } from "@/lib/booking/reservation";
import {
  MAX_PROOF_BYTES,
  PROOF_MIME_TYPES,
  proofPrefix,
  putFile,
  StorageError,
} from "@/lib/storage";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  dispatchInBackground,
  notifyAppointment,
} from "@/lib/notifications/dispatch";

/**
 * POST /api/reservation/{token}/proof
 *
 * The customer uploads the proof of their manual deposit. The token in the URL
 * is the authorisation: it is unguessable and was only ever sent to the person
 * who made the booking.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const limit = rateLimit(
    `proof:${clientIp(request.headers)}`,
    LIMITS.proofUpload.limit,
    LIMITS.proofUpload.windowSeconds,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans un moment." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { accessToken: token },
    select: {
      id: true,
      providerId: true,
      status: true,
      validationMethod: true,
      expiresAt: true,
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  if (appointment.validationMethod !== "MANUAL_PAYMENT") {
    return NextResponse.json(
      { error: "Cette réservation ne demande pas de preuve de paiement." },
      { status: 409 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const uploaded = form.get("proof");
  if (!(uploaded instanceof File) || uploaded.size === 0) {
    return NextResponse.json(
      { error: "Sélectionnez un fichier à envoyer." },
      { status: 400 },
    );
  }

  if (uploaded.size > MAX_PROOF_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux : 8 Mo maximum." },
      { status: 413 },
    );
  }

  let stored;
  try {
    const bytes = new Uint8Array(await uploaded.arrayBuffer());
    stored = await putFile(bytes, {
      prefix: proofPrefix(appointment.providerId),
      allowedMimeTypes: PROOF_MIME_TYPES,
      maxBytes: MAX_PROOF_BYTES,
      declaredMimeType: uploaded.type,
    });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "TOO_LARGE" ? 413 : 400 },
      );
    }
    throw error;
  }

  try {
    const updated = await submitPaymentProof({
      appointmentId: appointment.id,
      storageKey: stored.key,
      originalName: safeName(uploaded.name),
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      checksum: stored.checksum,
    });

    dispatchInBackground(
      () => notifyAppointment("provider.proof.submitted", updated.id, {
        discriminator: String(updated.paymentSubmittedAt?.getTime() ?? ""),
      }),
      `proof ${updated.reference}`,
    );

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    throw error;
  }
}

/** Keep the original name for the provider's benefit, minus anything risky. */
function safeName(name: string): string {
  return (
    name
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[/\\]/g, "-")
      .slice(-120) || "preuve"
  );
}
