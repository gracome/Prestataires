import type { ProviderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, eachLocalDate, localDateTimeToUtc, toLocalDate } from "@/lib/time";
import type { Period } from "@/lib/reports/period";

/**
 * The platform's own figures.
 *
 * Measured in activity, never in money. The platform is sold as a licence, so
 * a provider's turnover serves no purpose here: knowing whether an account is
 * alive and whether it needs help is what bookings, silence and configuration
 * answer. Holding her takings on top of that would be data with no use.
 *
 * Aggregates only. Nothing here reads a customer, an appointment's detail or
 * a payment proof.
 *
 * The platform has no timezone of its own, so days are cut in this one. It
 * only decides which side of midnight a booking falls on.
 */

export const PLATFORM_TIMEZONE = "Africa/Porto-Novo";

const HONOURED = ["COMPLETED", "CONFIRMED"] as const;

export type PlatformMetrics = {
  /** Accounts that existed at the end of the period. */
  providers: number;
  active: number;
  draft: number;
  suspended: number;
  /** Accounts created inside the period. */
  created: number;
  /** Accounts that took at least one booking inside the period. */
  trading: number;
  appointments: number;
  honoured: number;
  cancelled: number;
  quotes: number;
  daily: Array<{ date: string; count: number; revenue: number }>;
};

export type ProviderRanking = {
  id: string;
  businessName: string;
  slug: string;
  status: ProviderStatus;
  appointments: number;
  honoured: number;
  /** Share of the platform's bookings over the period. */
  share: number;
};

function bounds(period: Period) {
  return {
    from: localDateTimeToUtc(period.from, 0, PLATFORM_TIMEZONE),
    to: localDateTimeToUtc(addDays(period.to, 1), 0, PLATFORM_TIMEZONE),
  };
}

export async function platformMetrics(period: Period): Promise<PlatformMetrics> {
  const { from, to } = bounds(period);

  const [byStatus, created, appointments, quotes] = await Promise.all([
    // Accounts created after the period ended are not part of its picture.
    prisma.provider.groupBy({
      by: ["status"],
      where: { createdAt: { lt: to } },
      _count: { _all: true },
    }),
    prisma.provider.count({ where: { createdAt: { gte: from, lt: to } } }),
    // No amount is selected. The platform counts bookings, not takings.
    prisma.appointment.findMany({
      where: { startsAt: { gte: from, lt: to } },
      select: { providerId: true, status: true, startsAt: true },
    }),
    prisma.quoteRequest.count({
      where: { createdAt: { gte: from, lt: to } },
    }),
  ]);

  const count = (status: ProviderStatus) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;

  const honouredSet = new Set<string>(HONOURED);
  const trading = new Set<string>();
  const perDay = new Map<string, number>();

  let honoured = 0;
  let cancelled = 0;

  for (const row of appointments) {
    trading.add(row.providerId);

    const day = toLocalDate(row.startsAt, PLATFORM_TIMEZONE);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);

    if (honouredSet.has(row.status)) honoured += 1;
    if (row.status === "CANCELLED" || row.status === "NO_SHOW") cancelled += 1;
  }

  return {
    providers: byStatus.reduce((sum, row) => sum + row._count._all, 0),
    active: count("ACTIVE"),
    draft: count("DRAFT"),
    suspended: count("SUSPENDED"),
    created,
    trading: trading.size,
    appointments: appointments.length,
    honoured,
    cancelled,
    quotes,
    daily: eachLocalDate(period.from, period.to).map((date) => ({
      date,
      count: perDay.get(date) ?? 0,
      // The chart shares its type with the provider reports, which plot money.
      // Here it plots the count, so this stays at zero.
      revenue: 0,
    })),
  };
}

/**
 * Providers ranked by how busy they were over the period.
 *
 * Counted in bookings, which is also what makes the ranking comparable: two
 * providers in different trades charge nothing alike, so ordering them by
 * takings would say more about their prices than about their use of the
 * platform.
 */
export async function rankProviders(
  period: Period,
  take = 8,
): Promise<ProviderRanking[]> {
  const { from, to } = bounds(period);

  const [all, honoured] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["providerId"],
      where: { startsAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["providerId"],
      where: { startsAt: { gte: from, lt: to }, status: { in: [...HONOURED] } },
      _count: { _all: true },
    }),
  ]);

  if (all.length === 0) return [];

  const providers = await prisma.provider.findMany({
    where: { id: { in: all.map((row) => row.providerId) } },
    select: { id: true, businessName: true, slug: true, status: true },
  });

  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  const honouredById = new Map(
    honoured.map((row) => [row.providerId, row._count._all]),
  );
  const total = all.reduce((sum, row) => sum + row._count._all, 0);

  return all
    .map((row) => {
      const provider = byId.get(row.providerId);
      return {
        id: row.providerId,
        businessName: provider?.businessName ?? "Activité supprimée",
        slug: provider?.slug ?? "",
        status: provider?.status ?? ("DRAFT" as ProviderStatus),
        appointments: row._count._all,
        honoured: honouredById.get(row.providerId) ?? 0,
        share: total > 0 ? row._count._all / total : 0,
      };
    })
    .sort((a, b) => b.appointments - a.appointments)
    .slice(0, take);
}

export type Attention = {
  providerId: string;
  businessName: string;
  reason: string;
  tone: "warning" | "danger" | "neutral";
};

/**
 * Accounts that need a look.
 *
 * Only configuration problems and silence, which is what the platform can
 * legitimately notice. A provider who takes no bookings has a problem the
 * platform should offer to help with, and a site that asks for a deposit with
 * nowhere to send it is broken for her customers.
 */
export async function needsAttention(now = new Date()): Promise<Attention[]> {
  const providers = await prisma.provider.findMany({
    select: {
      id: true,
      businessName: true,
      status: true,
      createdAt: true,
      _count: { select: { services: true, paymentInstructions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (providers.length === 0) return [];

  const ids = providers.map((provider) => provider.id);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [lastBooking, depositServices] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["providerId"],
      where: { providerId: { in: ids } },
      _max: { createdAt: true },
    }),
    prisma.service.groupBy({
      by: ["providerId"],
      where: { providerId: { in: ids }, active: true, depositRequired: true },
      _count: { _all: true },
    }),
  ]);

  const lastById = new Map(
    lastBooking.map((row) => [row.providerId, row._max.createdAt]),
  );
  const depositById = new Map(
    depositServices.map((row) => [row.providerId, row._count._all]),
  );

  const out: Attention[] = [];

  for (const provider of providers) {
    const base = { providerId: provider.id, businessName: provider.businessName };

    if (provider.status === "SUSPENDED") {
      out.push({ ...base, reason: "Suspendue", tone: "danger" });
      continue;
    }

    if ((depositById.get(provider.id) ?? 0) > 0 && provider._count.paymentInstructions === 0) {
      out.push({
        ...base,
        reason: "Demande un acompte sans instruction de paiement",
        tone: "danger",
      });
      continue;
    }

    if (provider._count.services === 0) {
      out.push({ ...base, reason: "Aucune prestation créée", tone: "warning" });
      continue;
    }

    if (provider.status === "DRAFT") {
      const days = Math.floor(
        (now.getTime() - provider.createdAt.getTime()) / 86_400_000,
      );
      out.push({
        ...base,
        reason:
          days > 7
            ? `En brouillon depuis ${days} jours`
            : "En brouillon, site pas encore publié",
        tone: days > 7 ? "warning" : "neutral",
      });
      continue;
    }

    const last = lastById.get(provider.id);
    if (!last) {
      out.push({ ...base, reason: "Aucune réservation reçue", tone: "warning" });
    } else if (last < thirtyDaysAgo) {
      const days = Math.floor((now.getTime() - last.getTime()) / 86_400_000);
      out.push({
        ...base,
        reason: `Aucune réservation depuis ${days} jours`,
        tone: "warning",
      });
    }
  }

  const weight = { danger: 0, warning: 1, neutral: 2 };
  return out.sort((a, b) => weight[a.tone] - weight[b.tone]);
}
