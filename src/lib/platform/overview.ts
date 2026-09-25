import type { ProviderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * What the platform owner is allowed to see without borrowing an account.
 *
 * Counts and dates. No customer name, no telephone number, no payment proof,
 * and no takings: the platform is sold as a licence, so a provider's turnover
 * serves no purpose here and is not read. The queries use explicit select
 * clauses for that reason, so a later include cannot quietly widen them.
 * Reading her book means opening a recorded support session instead.
 */

export type ProviderRow = {
  id: string;
  slug: string;
  businessName: string;
  ownerName: string;
  email: string;
  status: ProviderStatus;
  city: string | null;
  currency: string;
  createdAt: Date;
  activeServices: number;
  appointments: number;
  honoured: number;
  lastBookingAt: Date | null;
  lastLoginAt: Date | null;
};

const HONOURED = ["COMPLETED", "CONFIRMED"] as const;

export async function listProviders(search?: string): Promise<ProviderRow[]> {
  const term = search?.trim();

  const providers = await prisma.provider.findMany({
    where: term
      ? {
          OR: [
            { businessName: { contains: term, mode: "insensitive" } },
            { ownerName: { contains: term, mode: "insensitive" } },
            { slug: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { city: { contains: term, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      slug: true,
      businessName: true,
      ownerName: true,
      email: true,
      status: true,
      city: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (providers.length === 0) return [];

  const ids = providers.map((provider) => provider.id);

  // Grouped queries rather than one per provider: the list stays a handful of
  // round trips however many accounts the platform holds.
  const [services, bookings, honoured, lastBooking, lastLogin] = await Promise.all([
    prisma.service.groupBy({
      by: ["providerId"],
      where: { providerId: { in: ids }, active: true },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["providerId"],
      where: { providerId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["providerId"],
      where: { providerId: { in: ids }, status: { in: [...HONOURED] } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["providerId"],
      where: { providerId: { in: ids } },
      _max: { createdAt: true },
    }),
    prisma.user.groupBy({
      by: ["providerId"],
      where: { providerId: { in: ids } },
      _max: { lastLoginAt: true },
    }),
  ]);

  const byProvider = <T extends { providerId: string | null }>(rows: T[]) =>
    new Map(rows.map((row) => [row.providerId ?? "", row]));

  const serviceMap = byProvider(services);
  const bookingMap = byProvider(bookings);
  const honouredMap = byProvider(honoured);
  const lastBookingMap = byProvider(lastBooking);
  const lastLoginMap = byProvider(lastLogin);

  return providers.map((provider) => ({
    ...provider,
    activeServices: serviceMap.get(provider.id)?._count._all ?? 0,
    appointments: bookingMap.get(provider.id)?._count._all ?? 0,
    honoured: honouredMap.get(provider.id)?._count._all ?? 0,
    lastBookingAt: lastBookingMap.get(provider.id)?._max.createdAt ?? null,
    lastLoginAt: lastLoginMap.get(provider.id)?._max.lastLoginAt ?? null,
  }));
}

export type SupportVisit = {
  id: string;
  adminName: string;
  adminEmail: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
};

/**
 * Support sessions opened on a provider's account.
 *
 * Read from both sides: the platform screens show who went where, and the
 * provider's own settings show who came into her account. Same rows, so the
 * two can never tell different stories.
 */
export async function supportVisits(
  where: { providerId?: string; adminId?: string },
  take = 20,
): Promise<SupportVisit[]> {
  const sessions = await prisma.session.findMany({
    where: {
      impersonatorId: where.adminId ?? { not: null },
      ...(where.providerId ? { user: { providerId: where.providerId } } : {}),
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      impersonator: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return sessions.map((session) => ({
    id: session.id,
    adminName: session.impersonator?.name ?? "Compte supprimé",
    adminEmail: session.impersonator?.email ?? "",
    startedAt: session.createdAt,
    expiresAt: session.expiresAt,
    endedAt: session.revokedAt,
  }));
}
