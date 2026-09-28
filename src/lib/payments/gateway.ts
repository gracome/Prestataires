import type { GatewayMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { hasFeature } from "@/lib/auth/features";

/**
 * Reading a provider's gateway account.
 *
 * Two things have to be true before a customer may be sent to a payment page:
 * the account subscribes to online payment, and the provider has switched her
 * own keys on. Keeping both checks here means no call site can remember one
 * and forget the other.
 */

export type GatewayAccount = {
  providerId: string;
  gateway: string;
  mode: GatewayMode;
  publicKey: string;
  secretKey: string;
  webhookSecret: string | null;
};

/** The account to charge through, or null when online payment is not available. */
export async function loadGatewayAccount(
  providerId: string,
): Promise<GatewayAccount | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      plan: true,
      extraModules: true,
      paymentGateway: true,
    },
  });

  if (!provider) return null;
  if (!hasFeature(provider, "ONLINE_PAYMENT")) return null;

  const account = provider.paymentGateway;
  if (!account || !account.enabled) return null;

  return decrypt(account);
}

/**
 * The account regardless of the enabled switch, for the settings screen and
 * for webhooks — a callback for a payment taken yesterday must still be
 * honoured if the provider has since turned the gateway off.
 */
export async function loadGatewayAccountRaw(
  providerId: string,
): Promise<(GatewayAccount & { enabled: boolean }) | null> {
  const account = await prisma.paymentGatewayAccount.findUnique({
    where: { providerId },
  });
  if (!account) return null;
  return { ...decrypt(account), enabled: account.enabled };
}

function decrypt(account: {
  providerId: string;
  gateway: string;
  mode: GatewayMode;
  publicKey: string;
  secretKeyEncrypted: string;
  webhookSecretEncrypted: string | null;
}): GatewayAccount {
  return {
    providerId: account.providerId,
    gateway: account.gateway,
    mode: account.mode,
    publicKey: account.publicKey,
    secretKey: decryptSecret(account.secretKeyEncrypted),
    webhookSecret: account.webhookSecretEncrypted
      ? decryptSecret(account.webhookSecretEncrypted)
      : null,
  };
}

/** Whether this provider can take a deposit online right now. */
export async function onlinePaymentAvailable(
  providerId: string,
): Promise<boolean> {
  return (await loadGatewayAccount(providerId)) !== null;
}

/**
 * Settle a booking whose customer has just come back from the payment page.
 *
 * The webhook remains the authority, and usually wins the race. This exists
 * for the seconds it has not arrived yet, and for the provider who has not
 * declared the webhook at all: without it she would take money and leave the
 * booking looking unpaid.
 *
 * Never throws. A gateway that is down must not turn the customer's own
 * booking page into an error.
 */
export async function settleReturnFromGateway(token: string): Promise<void> {
  const { prisma: db } = await import("@/lib/db");

  const appointment = await db.appointment.findUnique({
    where: { accessToken: token },
    select: {
      id: true,
      providerId: true,
      status: true,
      gatewayTransactionId: true,
    },
  });

  if (
    !appointment ||
    !appointment.gatewayTransactionId ||
    appointment.status !== "AWAITING_PAYMENT"
  ) {
    return;
  }

  try {
    const account = await loadGatewayAccountRaw(appointment.providerId);
    if (!account) return;

    const { fetchTransactionStatus } = await import("./fedapay");
    const { status } = await fetchTransactionStatus(
      account,
      appointment.gatewayTransactionId,
    );

    if (status !== "approved" && status !== "transferred") return;

    const { confirmOnlinePayment } = await import("@/lib/booking/reservation");
    await confirmOnlinePayment({
      appointmentId: appointment.id,
      transactionId: appointment.gatewayTransactionId,
    });

    const { dispatchInBackground, notifyAppointment } = await import(
      "@/lib/notifications/dispatch"
    );
    const { upsertAppointmentEvent } = await import("@/lib/google/calendar");

    dispatchInBackground(async () => {
      await notifyAppointment("customer.booking.confirmed", appointment.id);
      await upsertAppointmentEvent(appointment.id);
    }, `gateway:return:${appointment.id}`);
  } catch {
    // Left for the webhook, or for the next reload.
  }
}
