import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BLOCKING_STATUSES } from "@/lib/booking/state-machine";
import {
  addDays,
  localDateTimeToUtc,
  toLocalDate,
  type LocalDate,
} from "@/lib/time";

/**
 * The till.
 *
 * A day at a small salon is two streams of money: the appointments booked
 * online, and everyone else. The second stream is usually the larger one, and
 * a provider whose figures only counted the first would be reading a fraction
 * of her own business.
 *
 * This module answers one question: what came in, on this day, from both.
 */

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "CARD", label: "Carte" },
  { value: "BANK_TRANSFER", label: "Virement" },
  { value: "OTHER", label: "Autre" },
];

const METHOD_LABELS = new Map(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
);

export function methodLabelFr(method: PaymentMethod): string {
  return METHOD_LABELS.get(method) ?? "Autre";
}

export type TillEntry = {
  id: string;
  label: string;
  amount: number;
  method: PaymentMethod | null;
  customerName: string | null;
  note: string | null;
  occurredAt: Date;
  /** Online bookings are read-only here: they are edited on their own screen. */
  source: "till" | "booking";
  /** For a booking, where to go to act on it. */
  href?: string;
  serviceId: string | null;
};

export type TillDay = {
  date: LocalDate;
  entries: TillEntry[];
  /** Everything that came in, both streams together. */
  total: number;
  tillTotal: number;
  bookingTotal: number;
  byMethod: Array<{ method: PaymentMethod; label: string; amount: number; count: number }>;
  count: number;
};

/**
 * One day's takings.
 *
 * An online appointment counts for the full price of the prestation, because
 * that is what the customer owes on the day. A deposit paid a week earlier is
 * not a second sale, it is part of that same amount, which is why deposits are
 * not added on top here.
 */
export async function loadDay(
  providerId: string,
  date: LocalDate,
  timezone: string,
): Promise<TillDay> {
  const from = localDateTimeToUtc(date, 0, timezone);
  const to = localDateTimeToUtc(addDays(date, 1), 0, timezone);

  const [sales, appointments] = await Promise.all([
    prisma.sale.findMany({
      where: { providerId, occurredAt: { gte: from, lt: to } },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        providerId,
        startsAt: { gte: from, lt: to },
        status: { in: [...BLOCKING_STATUSES, "COMPLETED"] },
      },
      select: {
        id: true,
        customerName: true,
        startsAt: true,
        totalAmount: true,
        status: true,
        service: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const entries: TillEntry[] = [
    ...sales.map((sale) => ({
      id: sale.id,
      label: sale.label,
      amount: sale.amount,
      method: sale.method,
      customerName: sale.customerName,
      note: sale.note,
      occurredAt: sale.occurredAt,
      source: "till" as const,
      serviceId: sale.serviceId,
    })),
    ...appointments.map((appointment) => ({
      id: appointment.id,
      label: appointment.service.name,
      amount: appointment.totalAmount,
      method: null,
      customerName: appointment.customerName,
      note: null,
      occurredAt: appointment.startsAt,
      source: "booking" as const,
      href: `/dashboard/reservations/${appointment.id}`,
      serviceId: appointment.service.id,
    })),
  ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const tillTotal = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const bookingTotal = appointments.reduce(
    (sum, appointment) => sum + appointment.totalAmount,
    0,
  );

  // Only the till entries carry a method: an online booking's money arrived
  // through whatever channel the deposit used, which is not recorded.
  const methods = new Map<PaymentMethod, { amount: number; count: number }>();
  for (const sale of sales) {
    const bucket = methods.get(sale.method) ?? { amount: 0, count: 0 };
    bucket.amount += sale.amount;
    bucket.count += 1;
    methods.set(sale.method, bucket);
  }

  return {
    date,
    entries,
    total: tillTotal + bookingTotal,
    tillTotal,
    bookingTotal,
    byMethod: PAYMENT_METHODS.filter((method) => methods.has(method.value)).map(
      (method) => ({
        method: method.value,
        label: method.label,
        ...methods.get(method.value)!,
      }),
    ),
    count: entries.length,
  };
}

/** Till takings over a range, for the reports. */
export async function tillRevenue(
  providerId: string,
  from: LocalDate,
  to: LocalDate,
  timezone: string,
): Promise<{ amount: number; count: number }> {
  const result = await prisma.sale.aggregate({
    where: {
      providerId,
      occurredAt: {
        gte: localDateTimeToUtc(from, 0, timezone),
        lt: localDateTimeToUtc(addDays(to, 1), 0, timezone),
      },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return { amount: result._sum.amount ?? 0, count: result._count._all };
}

/** Till takings day by day, to lay over the report chart. */
export async function tillDaily(
  providerId: string,
  from: LocalDate,
  to: LocalDate,
  timezone: string,
): Promise<Map<string, number>> {
  const sales = await prisma.sale.findMany({
    where: {
      providerId,
      occurredAt: {
        gte: localDateTimeToUtc(from, 0, timezone),
        lt: localDateTimeToUtc(addDays(to, 1), 0, timezone),
      },
    },
    select: { occurredAt: true, amount: true },
  });

  const byDay = new Map<string, number>();
  for (const sale of sales) {
    const day = toLocalDate(sale.occurredAt, timezone);
    byDay.set(day, (byDay.get(day) ?? 0) + sale.amount);
  }
  return byDay;
}

/** What the till sold most of, over a range. */
export async function tillBreakdown(
  providerId: string,
  from: LocalDate,
  to: LocalDate,
  timezone: string,
  take = 8,
): Promise<Array<{ label: string; count: number; amount: number }>> {
  const grouped = await prisma.sale.groupBy({
    by: ["label"],
    where: {
      providerId,
      occurredAt: {
        gte: localDateTimeToUtc(from, 0, timezone),
        lt: localDateTimeToUtc(addDays(to, 1), 0, timezone),
      },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return grouped
    .map((row) => ({
      label: row.label,
      count: row._count._all,
      amount: row._sum.amount ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, take);
}

export { toLocalDate };
