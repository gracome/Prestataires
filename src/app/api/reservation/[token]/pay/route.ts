import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { loadGatewayAccount } from "@/lib/payments/gateway";
import { createCheckout, FedaPayError } from "@/lib/payments/fedapay";

/**
 * POST /api/reservation/{token}/pay
 *
 * Opens a payment page for the deposit and returns where to send the
 * customer. Nothing here confirms anything: the booking only moves once the
 * gateway says the money arrived, through the webhook or through the check
 * made when the customer comes back.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const limit = rateLimit(
    `pay:${clientIp(request.headers)}`,
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
      reference: true,
      status: true,
      validationMethod: true,
      depositAmount: true,
      currency: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      expiresAt: true,
      provider: { select: { businessName: true } },
      service: { select: { name: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  if (appointment.validationMethod !== "ONLINE_PAYMENT") {
    return NextResponse.json(
      { error: "Cette réservation ne se règle pas en ligne." },
      { status: 409 },
    );
  }

  if (appointment.status !== "AWAITING_PAYMENT") {
    return NextResponse.json(
      { error: "Cette réservation n'attend plus de paiement." },
      { status: 409 },
    );
  }

  if (appointment.expiresAt && appointment.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Le délai de paiement est dépassé." },
      { status: 409 },
    );
  }

  const account = await loadGatewayAccount(appointment.providerId);
  if (!account) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas disponible." },
      { status: 409 },
    );
  }

  // The first word is the only part a gateway reliably wants as a first name,
  // and a single-word name must not leave the last name empty.
  const [firstname, ...rest] = appointment.customerName.trim().split(/\s+/);

  try {
    const checkout = await createCheckout(account, {
      amount: appointment.depositAmount,
      currency: appointment.currency,
      description: `Acompte ${appointment.reference} — ${appointment.service.name}`,
      callbackUrl: appUrl(`/reservation/${token}?paiement=retour`),
      customer: {
        firstname,
        lastname: rest.join(" ") || firstname,
        email: appointment.customerEmail,
        phone: appointment.customerPhone,
      },
    });

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        gatewayProvider: account.gateway,
        gatewayTransactionId: checkout.transactionId,
      },
    });

    return NextResponse.json({ paymentUrl: checkout.paymentUrl });
  } catch (error) {
    if (error instanceof FedaPayError) {
      // The provider needs to know her gateway is misbehaving; the customer
      // only needs to know to fall back on the transfer.
      await prisma.paymentGatewayAccount.updateMany({
        where: { providerId: appointment.providerId },
        data: { lastError: error.message, lastCheckedAt: new Date() },
      });

      return NextResponse.json(
        {
          error:
            "Le paiement en ligne est momentanément indisponible. " +
            "Vous pouvez régler par dépôt et envoyer votre reçu.",
        },
        { status: 502 },
      );
    }
    throw error;
  }
}
