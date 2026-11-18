"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProviderApi } from "@/lib/auth/guard";
import { CheckoutError, startSubscriptionCheckout } from "@/lib/plans/checkout";
import { FedaPayError } from "@/lib/payments/fedapay";

const schema = z.object({
  plan: z.enum(["ESSENTIEL", "RENDEZ_VOUS", "BUSINESS"]),
  billingPeriod: z.enum(["MONTHLY", "YEARLY"]),
});

export type CheckoutState = { status: "idle" } | { status: "error"; message: string };

/**
 * Send her to FedaPay to pay the package she picked.
 *
 * The redirect happens outside the try: Next.js implements it by throwing,
 * and catching it here would turn a successful start into an error message.
 */
export async function startCheckoutAction(
  _state: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const { provider } = await requireProviderApi("subscription");

  const parsed = schema.safeParse({
    plan: formData.get("plan"),
    billingPeriod: formData.get("billingPeriod"),
  });
  if (!parsed.success) return { status: "error", message: "Choisissez une offre et une durée." };

  let paymentUrl: string;
  try {
    ({ paymentUrl } = await startSubscriptionCheckout({ providerId: provider.id, ...parsed.data }));
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof FedaPayError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  redirect(paymentUrl);
}
