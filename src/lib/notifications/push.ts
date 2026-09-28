import webpush from "web-push";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Web push to a provider's own devices.
 *
 * Email tells a customer what happened. Push tells the provider, on the phone
 * in her pocket, that something needs her now — a deposit to check, a booking
 * to accept. The two carry different urgency and neither replaces the other.
 *
 * Every send is best-effort: a push service that is down, or a browser that
 * has been uninstalled, must never fail the booking that triggered it.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Where clicking lands. Relative to the site root. */
  url?: string;
  /** Same tag replaces an earlier notice instead of stacking beside it. */
  tag?: string;
};

let configured: boolean | null = null;

/**
 * Whether push can work at all. Cached: this is read on every dispatch and the
 * answer only changes when the process restarts.
 */
export function pushConfigured(): boolean {
  if (configured !== null) return configured;

  const config = env();
  configured = Boolean(
    config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY && config.VAPID_SUBJECT,
  );

  if (configured) {
    webpush.setVapidDetails(
      config.VAPID_SUBJECT!,
      config.VAPID_PUBLIC_KEY!,
      config.VAPID_PRIVATE_KEY!,
    );
  }

  return configured;
}

/** The key the browser needs to subscribe. Public by design. */
export function publicVapidKey(): string | null {
  return env().VAPID_PUBLIC_KEY ?? null;
}

/**
 * Notify every device a provider has registered.
 *
 * Returns how many went out, which is what the caller logs. Dead subscriptions
 * are removed as they are discovered: a push service answers 404 or 410 once a
 * browser is gone for good, and keeping the row would mean retrying it forever.
 */
export async function pushToProvider(
  providerId: string,
  payload: PushPayload,
): Promise<number> {
  if (!pushConfigured()) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { providerId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    ...(payload.tag ? { tag: payload.tag } : {}),
  });

  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          { TTL: 3600 },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;

        if (status === 404 || status === 410) {
          dead.push(subscription.id);
          return;
        }

        // A softer failure: the device may simply be unreachable right now.
        // Counted, and dropped once it has failed often enough to be beyond
        // doubt, so one bad night does not cost a provider her notifications.
        await prisma.pushSubscription
          .update({
            where: { id: subscription.id },
            data: { failureCount: { increment: 1 } },
          })
          .catch(() => undefined);
      }
    }),
  );

  if (dead.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: dead } } })
      .catch(() => undefined);
  }

  if (sent > 0) {
    await prisma.pushSubscription
      .updateMany({
        where: { providerId, id: { notIn: dead } },
        data: { lastSentAt: new Date(), failureCount: 0 },
      })
      .catch(() => undefined);
  }

  // Subscriptions that have failed repeatedly are cleared out here rather than
  // in a separate job: this is the only place that learns they are failing.
  await prisma.pushSubscription
    .deleteMany({ where: { providerId, failureCount: { gte: 10 } } })
    .catch(() => undefined);

  return sent;
}

/**
 * The provider-facing alerts, named so a caller states the event rather than
 * composing a message. Keeping the wording here means the phrasing is decided
 * once, next to everything else that speaks to a provider.
 */
export async function pushAppointmentAlert(
  kind: "booking.created" | "proof.submitted",
  appointmentId: string,
): Promise<number> {
  if (!pushConfigured()) return 0;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      providerId: true,
      customerName: true,
      reference: true,
      service: { select: { name: true } },
    },
  });

  if (!appointment) return 0;

  const copy =
    kind === "booking.created"
      ? {
          title: "Nouvelle réservation",
          body: `${appointment.customerName} — ${appointment.service.name}`,
        }
      : {
          title: "Reçu de paiement à vérifier",
          body: `${appointment.customerName} a envoyé sa preuve de paiement.`,
        };

  return pushToProvider(appointment.providerId, {
    ...copy,
    url: `/dashboard/reservations/${appointment.id}`,
    // One notice per booking: a customer who re-sends a receipt replaces the
    // earlier alert instead of adding to a pile.
    tag: `appointment:${appointment.id}`,
  });
}
