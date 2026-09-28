import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadGatewayAccountRaw } from "@/lib/payments/gateway";
import {
  fetchTransactionStatus,
  verifyWebhookSignature,
} from "@/lib/payments/fedapay";
import { confirmOnlinePayment } from "@/lib/booking/reservation";
import {
  dispatchInBackground,
  notifyAppointment,
} from "@/lib/notifications/dispatch";
import { upsertAppointmentEvent } from "@/lib/google/calendar";

/**
 * POST /api/payments/fedapay/{providerId}
 *
 * FedaPay's callback. One URL per provider, because each one signs with her
 * own webhook secret — there is no platform-wide key to verify against.
 *
 * The body is treated as a notification, never as evidence. It says which
 * transaction changed; the status is then asked of FedaPay directly over an
 * authenticated call. A forged body therefore buys nothing even if the
 * signature check were somehow bypassed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await context.params;

  // Read the bytes as they were signed: re-serialising parsed JSON changes
  // them, and every signature would fail.
  const rawBody = await request.text();

  const account = await loadGatewayAccountRaw(providerId);
  if (!account) {
    return NextResponse.json({ error: "Inconnu." }, { status: 404 });
  }

  if (!account.webhookSecret) {
    // Unsigned callbacks are refused rather than trusted: without a secret
    // there is nothing to tell FedaPay apart from anyone else.
    return NextResponse.json(
      { error: "Webhook non configuré." },
      { status: 400 },
    );
  }

  const signed = verifyWebhookSignature({
    header: request.headers.get("x-fedapay-signature"),
    rawBody,
    secret: account.webhookSecret,
  });

  if (!signed) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  const transactionId = extractTransactionId(rawBody);
  if (!transactionId) {
    // Nothing to act on, but the callback was genuine: acknowledging it stops
    // FedaPay retrying something we will never understand.
    return NextResponse.json({ received: true });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { providerId, gatewayTransactionId: transactionId },
    select: { id: true, status: true },
  });

  if (!appointment) {
    return NextResponse.json({ received: true });
  }

  const { status } = await fetchTransactionStatus(account, transactionId);

  if (status !== "approved" && status !== "transferred") {
    // Declined, cancelled or still pending: the hold is left to expire on its
    // own rather than being cancelled here, so a customer who retries in the
    // next few minutes still has her slot.
    return NextResponse.json({ received: true, status });
  }

  if (appointment.status === "CONFIRMED") {
    return NextResponse.json({ received: true, status: "already-confirmed" });
  }

  await confirmOnlinePayment({
    appointmentId: appointment.id,
    transactionId,
  });

  // After the response, like every other notification in the application: a
  // slow mail server must not make FedaPay think the callback failed.
  dispatchInBackground(async () => {
    await notifyAppointment("customer.booking.confirmed", appointment.id);
    await upsertAppointmentEvent(appointment.id);
  }, `fedapay:confirmed:${appointment.id}`);

  return NextResponse.json({ received: true, status: "confirmed" });
}

/**
 * The transaction id, wherever FedaPay puts it.
 *
 * Their payload wraps the entity under an "entity" key and repeats the id at
 * the top level in some event shapes, so both are accepted rather than
 * depending on one.
 */
function extractTransactionId(rawBody: string): string | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const entity = record.entity;
  if (entity && typeof entity === "object") {
    const id = (entity as Record<string, unknown>).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }

  if (typeof record.id === "string" || typeof record.id === "number") {
    return String(record.id);
  }

  return null;
}
