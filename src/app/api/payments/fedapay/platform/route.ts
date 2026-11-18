import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifyWebhookSignature } from "@/lib/payments/fedapay";
import { settleSubscriptionCheckout } from "@/lib/plans/checkout";

/**
 * POST /api/payments/fedapay/platform
 *
 * FedaPay's callback for subscription payments, signed with the platform's
 * own webhook secret. Kept apart from the per-provider route: those payments
 * land on each provider's account, these on the platform's.
 *
 * As there, the body only says which transaction moved. Whether it was paid
 * is asked of FedaPay over an authenticated call before anything changes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = env().PLATFORM_FEDAPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  const rawBody = await request.text();

  const signed = verifyWebhookSignature({
    header: request.headers.get("x-fedapay-signature"),
    rawBody,
    secret,
  });
  if (!signed) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  const transactionId = extractTransactionId(rawBody);
  if (!transactionId) return NextResponse.json({ received: true });

  const outcome = await settleSubscriptionCheckout({ gatewayTransactionId: transactionId });
  return NextResponse.json({ received: true, outcome });
}

/** Same shapes as the provider route: under "entity", or at the top level. */
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
  if (typeof record.id === "string" || typeof record.id === "number") return String(record.id);
  return null;
}
