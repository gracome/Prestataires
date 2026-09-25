import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EXPIRABLE_STATUSES } from "./state-machine";

/**
 * Automatic release of slots (cahier des charges sections 11, 12 and 31).
 *
 * Three situations end a pending booking:
 *   1. the customer never uploads a proof before the deadline;
 *   2. the provider never verifies a submitted proof before the deadline;
 *   3. the slot start time arrives while the booking is still pending.
 *
 * Expiry runs in two places. The cron job sweeps every provider and sends the
 * notification emails. The availability read path calls the same function
 * without notifications, so an abandoned slot reappears immediately for the
 * next customer instead of waiting for the next sweep.
 */

export type ExpirationResult = {
  expiredIds: string[];
};

export async function releaseExpiredAppointments(options: {
  providerId?: string;
  now?: Date;
  tx?: Prisma.TransactionClient;
  limit?: number;
}): Promise<ExpirationResult> {
  const now = options.now ?? new Date();
  const client = options.tx ?? prisma;

  const candidates = await client.appointment.findMany({
    where: {
      ...(options.providerId ? { providerId: options.providerId } : {}),
      status: { in: [...EXPIRABLE_STATUSES] },
      OR: [
        { expiresAt: { lte: now } },
        // A pending booking whose slot has already begun is dead weight.
        { startsAt: { lte: now } },
      ],
    },
    select: { id: true, status: true, expiresAt: true, startsAt: true },
    take: options.limit ?? 500,
  });

  if (candidates.length === 0) return { expiredIds: [] };

  const expiredIds: string[] = [];

  for (const candidate of candidates) {
    // Guarded update: only expire if the row is still in the status we read.
    // Two concurrent sweeps therefore cannot both claim the same appointment.
    const updated = await client.appointment.updateMany({
      where: { id: candidate.id, status: candidate.status },
      data: {
        status: "EXPIRED",
        expiresAt: null,
        paymentStatus:
          candidate.status === "PAYMENT_PROOF_SUBMITTED"
            ? "PROOF_SUBMITTED"
            : undefined,
      },
    });

    if (updated.count === 0) continue;

    expiredIds.push(candidate.id);

    await client.appointmentEvent.create({
      data: {
        appointmentId: candidate.id,
        fromStatus: candidate.status,
        toStatus: "EXPIRED",
        actor: "system",
        reason:
          candidate.expiresAt && candidate.expiresAt <= now
            ? "Deadline reached"
            : "Slot start time reached while still pending",
        metadata: {
          expiresAt: candidate.expiresAt?.toISOString() ?? null,
          startsAt: candidate.startsAt.toISOString(),
        },
      },
    });
  }

  return { expiredIds };
}

/**
 * Confirmed appointments whose end time has passed become COMPLETED so the
 * dashboard separates history from what is still to come.
 */
export async function completePastAppointments(options: {
  now?: Date;
  limit?: number;
} = {}): Promise<{ completedIds: string[] }> {
  const now = options.now ?? new Date();

  const candidates = await prisma.appointment.findMany({
    where: { status: "CONFIRMED", endsAt: { lte: now } },
    select: { id: true },
    take: options.limit ?? 500,
  });

  const completedIds: string[] = [];

  for (const candidate of candidates) {
    const updated = await prisma.appointment.updateMany({
      where: { id: candidate.id, status: "CONFIRMED" },
      data: { status: "COMPLETED" },
    });
    if (updated.count === 0) continue;

    completedIds.push(candidate.id);
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: candidate.id,
        fromStatus: "CONFIRMED",
        toStatus: "COMPLETED",
        actor: "system",
        reason: "Appointment end time passed",
      },
    });
  }

  return { completedIds };
}
