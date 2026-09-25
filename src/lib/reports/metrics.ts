import type { AppointmentStatus } from "@prisma/client";
import { toLocalDate, type LocalDate } from "@/lib/time";

/**
 * Report metrics (cahier des charges section 19).
 *
 * A pure function over the appointments of a period, so the same computation
 * feeds the screen, the comparison against the previous period and the CSV
 * export, and so it can be tested without a database.
 *
 * Money stays in minor units throughout; formatting happens at the edge.
 */

export type ReportAppointment = {
  id: string;
  status: AppointmentStatus;
  startsAt: Date;
  serviceEndsAt: Date;
  totalAmount: number;
  depositAmount: number;
  depositVerified: boolean;
  serviceId: string;
  serviceName: string;
  categoryName: string | null;
  /** Phone is the identity we actually have for every customer. */
  customerKey: string;
  /** True when this provider had never seen that customer before the period. */
  isNewCustomer: boolean;
};

export type Breakdown = {
  key: string;
  label: string;
  count: number;
  revenue: number;
  /** Share of the honoured revenue, 0 to 1. */
  share: number;
};

export type DailyPoint = {
  date: LocalDate;
  count: number;
  revenue: number;
};

export type ReportMetrics = {
  /** Appointments that happened or are still going to: the useful denominator. */
  booked: number;
  honoured: number;
  upcoming: number;
  cancelled: number;
  noShow: number;
  expired: number;
  rejected: number;

  /** Money actually earned: honoured appointments only. */
  revenue: number;
  /** Money already committed for appointments still to come. */
  expectedRevenue: number;
  /** Deposits verified in the period. */
  depositsCollected: number;
  averageBasket: number;

  /** Minutes of work on honoured appointments. */
  bookedMinutes: number;

  customers: number;
  newCustomers: number;
  returningCustomers: number;

  cancellationRate: number;
  noShowRate: number;

  byService: Breakdown[];
  byCategory: Breakdown[];
  daily: DailyPoint[];
};

/** Statuses that count as work actually done. */
const HONOURED: AppointmentStatus[] = ["COMPLETED"];
/** Statuses that count as still to come. */
const UPCOMING: AppointmentStatus[] = [
  "CONFIRMED",
  "PAYMENT_PROOF_SUBMITTED",
  "AWAITING_PAYMENT",
  "TEMPORARILY_RESERVED",
];

export function computeMetrics(
  appointments: ReportAppointment[],
  options: { timezone: string; dates: LocalDate[]; now?: Date },
): ReportMetrics {
  const now = options.now ?? new Date();

  let honoured = 0;
  let upcoming = 0;
  let cancelled = 0;
  let noShow = 0;
  let expired = 0;
  let rejected = 0;

  let revenue = 0;
  let expectedRevenue = 0;
  let depositsCollected = 0;
  let bookedMinutes = 0;

  const customers = new Set<string>();
  const newCustomers = new Set<string>();

  const services = new Map<string, Breakdown>();
  const categories = new Map<string, Breakdown>();
  const daily = new Map<LocalDate, DailyPoint>();

  for (const date of options.dates) {
    daily.set(date, { date, count: 0, revenue: 0 });
  }

  for (const appointment of appointments) {
    const isHonoured =
      HONOURED.includes(appointment.status) ||
      // A confirmed appointment whose time has passed is work done, even if
      // the closing job has not run yet.
      (appointment.status === "CONFIRMED" && appointment.serviceEndsAt <= now);

    const isUpcoming =
      !isHonoured && UPCOMING.includes(appointment.status);

    if (isHonoured) honoured += 1;
    else if (isUpcoming) upcoming += 1;

    if (appointment.status === "CANCELLED") cancelled += 1;
    if (appointment.status === "NO_SHOW") noShow += 1;
    if (appointment.status === "EXPIRED") expired += 1;
    if (appointment.status === "PAYMENT_REJECTED") rejected += 1;

    if (appointment.depositVerified) {
      depositsCollected += appointment.depositAmount;
    }

    if (isUpcoming) expectedRevenue += appointment.totalAmount;
    if (!isHonoured) continue;

    // From here on: honoured appointments only.
    revenue += appointment.totalAmount;
    bookedMinutes += Math.max(
      0,
      Math.round(
        (appointment.serviceEndsAt.getTime() - appointment.startsAt.getTime()) / 60_000,
      ),
    );

    customers.add(appointment.customerKey);
    if (appointment.isNewCustomer) newCustomers.add(appointment.customerKey);

    bump(services, appointment.serviceId, appointment.serviceName, appointment.totalAmount);
    bump(
      categories,
      appointment.categoryName ?? "__none__",
      appointment.categoryName ?? "Sans catégorie",
      appointment.totalAmount,
    );

    const day = toLocalDate(appointment.startsAt, options.timezone);
    const point = daily.get(day);
    if (point) {
      point.count += 1;
      point.revenue += appointment.totalAmount;
    }
  }

  const booked = honoured + upcoming + cancelled + noShow;

  return {
    booked,
    honoured,
    upcoming,
    cancelled,
    noShow,
    expired,
    rejected,

    revenue,
    expectedRevenue,
    depositsCollected,
    averageBasket: honoured > 0 ? Math.round(revenue / honoured) : 0,

    bookedMinutes,

    customers: customers.size,
    newCustomers: newCustomers.size,
    returningCustomers: customers.size - newCustomers.size,

    cancellationRate: booked > 0 ? cancelled / booked : 0,
    noShowRate: booked > 0 ? noShow / booked : 0,

    byService: rank(services, revenue),
    byCategory: rank(categories, revenue),
    daily: options.dates.map((date) => daily.get(date) as DailyPoint),
  };
}

function bump(
  target: Map<string, Breakdown>,
  key: string,
  label: string,
  revenue: number,
): void {
  const existing = target.get(key);
  if (existing) {
    existing.count += 1;
    existing.revenue += revenue;
    return;
  }
  target.set(key, { key, label, count: 1, revenue, share: 0 });
}

function rank(target: Map<string, Breakdown>, total: number): Breakdown[] {
  return Array.from(target.values())
    .map((entry) => ({
      ...entry,
      share: total > 0 ? entry.revenue / total : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
}

export type Delta = {
  /** Absolute change, in the unit of the metric. */
  change: number;
  /** Relative change, or null when a percentage would not be honest. */
  ratio: number | null;
  direction: "up" | "down" | "flat";
  /** What the figure was over the previous period. */
  previous: number;
};

/**
 * Below this, a percentage says more than it knows: two absences becoming four
 * is "+100 %", which reads like a collapse rather than two extra absences. Such
 * a delta is reported as the plain difference instead.
 */
const MIN_BASE_FOR_PERCENTAGE = 10;

/**
 * Compare one figure against the previous period.
 *
 * Growth from zero has no percentage: reporting "+100 %" when a provider went
 * from no bookings to three would be a lie dressed as a number.
 */
export function compare(current: number, previous: number): Delta {
  const change = current - previous;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const meaningful = Math.abs(previous) >= MIN_BASE_FOR_PERCENTAGE;
  return {
    change,
    ratio: previous === 0 || !meaningful ? null : change / previous,
    direction,
    previous,
  };
}
