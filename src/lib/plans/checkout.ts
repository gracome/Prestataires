import type { BillingPeriod, Plan } from "@prisma/client";
import { prisma } from "@/lib/db";
import { appUrl, env } from "@/lib/env";
import {
  createCheckout,
  fetchTransactionStatus,
  type FedaPayCredentials,
} from "@/lib/payments/fedapay";
import { planLabel, priceFor } from "./catalogue";
import { recordSubscriptionPayment } from "./subscription";

/**
 * A provider paying her own subscription, online.
 *
 * The money goes to the platform's FedaPay account, not hers: this is the
 * mirror image of the deposit flow, where her customers pay her. FedaPay is
 * only ever trusted through an authenticated call asking for a transaction's
 * status; a redirect or a callback body is a hint to go and ask, never proof.
 */

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

/** The platform's FedaPay credentials, or null when online payment is off. */
export function platformGateway(): FedaPayCredentials | null {
  const config = env();
  if (!config.PLATFORM_FEDAPAY_SECRET_KEY) return null;
  return { mode: config.PLATFORM_FEDAPAY_MODE, secretKey: config.PLATFORM_FEDAPAY_SECRET_KEY };
}

export function onlineSubscriptionPaymentAvailable(): boolean {
  return platformGateway() !== null;
}

/**
 * Open a payment for a package and a period, and return FedaPay's page.
 *
 * The modules she already buys on top of her package come with the renewal,
 * at their price: renewing must not silently drop something she relies on.
 */
export async function startSubscriptionCheckout(input: {
  providerId: string;
  plan: Plan;
  billingPeriod: BillingPeriod;
}): Promise<{ paymentUrl: string }> {
  const gateway = platformGateway();
  if (!gateway) throw new CheckoutError("Le paiement en ligne n'est pas encore activé.");

  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: input.providerId },
    select: {
      id: true,
      businessName: true,
      ownerName: true,
      email: true,
      phone: true,
      currency: true,
      extraModules: true,
    },
  });

  const amount = priceFor(input.plan, input.billingPeriod, provider.extraModules);

  const checkout = await prisma.subscriptionCheckout.create({
    data: {
      providerId: provider.id,
      plan: input.plan,
      billingPeriod: input.billingPeriod,
      extraModules: provider.extraModules,
      amount,
      currency: provider.currency,
    },
  });

  const [firstname, ...rest] = provider.ownerName.trim().split(/\s+/);

  const { transactionId, paymentUrl } = await createCheckout(gateway, {
    amount,
    currency: provider.currency,
    description: `Abonnement ${planLabel(input.plan)} (${input.billingPeriod === "YEARLY" ? "1 an" : "1 mois"}) · ${provider.businessName}`,
    callbackUrl: appUrl(`/dashboard/abonnement?paiement=retour&ref=${checkout.id}`),
    customer: {
      firstname: firstname || provider.businessName,
      lastname: rest.join(" ") || undefined,
      email: provider.email,
      phone: provider.phone,
    },
  });

  await prisma.subscriptionCheckout.update({
    where: { id: checkout.id },
    data: { gatewayTransactionId: transactionId },
  });

  return { paymentUrl };
}

export type SettleOutcome = "paid" | "already-paid" | "failed" | "pending" | "unknown";

/**
 * Ask FedaPay how a payment went and act on the answer, once.
 *
 * Called from the webhook and from the page she returns to, whichever comes
 * first; the guarded update from PENDING means the second one finds nothing to
 * do. The amount FedaPay reports must match the one asked, so a transaction
 * for a smaller sum cannot buy a larger package.
 */
export async function settleSubscriptionCheckout(
  where: { id: string } | { gatewayTransactionId: string },
): Promise<SettleOutcome> {
  const gateway = platformGateway();
  if (!gateway) return "unknown";

  const checkout = await prisma.subscriptionCheckout.findFirst({ where });
  if (!checkout || !checkout.gatewayTransactionId) return "unknown";
  if (checkout.status === "PAID") return "already-paid";
  if (checkout.status === "FAILED") return "failed";

  const { status, amount } = await fetchTransactionStatus(gateway, checkout.gatewayTransactionId);

  if (status === "declined" || status === "canceled" || status === "refunded") {
    await prisma.subscriptionCheckout.updateMany({
      where: { id: checkout.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return "failed";
  }

  if (status !== "approved" && status !== "transferred") return "pending";
  if (amount !== null && amount < checkout.amount) return "failed";

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.subscriptionCheckout.updateMany({
      where: { id: checkout.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claimed.count === 0) return "already-paid" as const;

    await recordSubscriptionPayment({
      providerId: checkout.providerId,
      plan: checkout.plan,
      billingPeriod: checkout.billingPeriod,
      extraModules: checkout.extraModules,
      amount: checkout.amount,
      method: "MOBILE_MONEY",
      note: `Paiement en ligne FedaPay, transaction ${checkout.gatewayTransactionId}`,
      client: tx,
    });

    return "paid" as const;
  });
}
