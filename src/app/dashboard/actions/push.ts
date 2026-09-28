"use server";

import { z } from "zod";
import { requireProviderApi } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { pushToProvider } from "@/lib/notifications/push";
import type { ActionState } from "@/lib/validation";

/**
 * Registering and forgetting a browser.
 *
 * A subscription belongs to one person on one device: the same provider on her
 * phone and on the salon laptop is two rows, and signing out of one must not
 * silence the other.
 */

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(400).optional(),
});

export async function savePushSubscriptionAction(
  input: unknown,
): Promise<ActionState> {
  const { provider, user } = await requireProviderApi();

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Abonnement invalide." };
  }

  // The endpoint is the browser's identity for this purpose. A re-subscribe
  // after a permission reset produces the same endpoint, so upserting keeps
  // one row per device instead of accumulating dead ones.
  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      providerId: provider.id,
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent: parsed.data.userAgent,
    },
    update: {
      providerId: provider.id,
      userId: user.id,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent: parsed.data.userAgent,
      failureCount: 0,
    },
  });

  return { status: "success", message: "Notifications activées sur cet appareil." };
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  // Scoped to the caller's own provider: an endpoint is not a secret, and
  // deleting by endpoint alone would let anyone silence anyone.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, providerId: provider.id },
  });

  return { status: "success", message: "Notifications désactivées sur cet appareil." };
}

/** Send one to the caller's own devices, so she can see what they look like. */
export async function sendTestPushAction(): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const sent = await pushToProvider(provider.id, {
    title: "Test de notification",
    body: "Si vous voyez ceci, tout fonctionne.",
    url: "/dashboard",
    tag: "test",
  });

  if (sent === 0) {
    return {
      status: "error",
      message:
        "Aucun appareil n'a reçu la notification. Vérifiez que vous les avez " +
        "autorisées dans votre navigateur.",
    };
  }

  return {
    status: "success",
    message: `Notification envoyée sur ${sent} appareil${sent > 1 ? "s" : ""}.`,
  };
}
