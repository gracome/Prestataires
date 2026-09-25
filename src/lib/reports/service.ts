import { prisma } from "@/lib/db";
import {
  addDays,
  eachLocalDate,
  localDateTimeToUtc,
  localDayOfWeek,
  type LocalDate,
} from "@/lib/time";
import { computeMetrics, type ReportAppointment, type ReportMetrics } from "./metrics";
import type { Period } from "./period";

/**
 * Loading the rows a report needs.
 *
 * Appointments are selected on their start time, which is what a provider
 * means by "what did I do in September", rather than on when they were booked.
 */

export type ReportData = {
  metrics: ReportMetrics;
  appointments: ReportAppointment[];
};

export async function loadReport(
  providerId: string,
  period: Period,
  timezone: string,
  now = new Date(),
): Promise<ReportData> {
  const from = localDateTimeToUtc(period.from, 0, timezone);
  const to = localDateTimeToUtc(addDays(period.to, 1), 0, timezone);

  const rows = await prisma.appointment.findMany({
    where: { providerId, startsAt: { gte: from, lt: to } },
    include: {
      service: { include: { category: { select: { name: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  const appointments: ReportAppointment[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    startsAt: row.startsAt,
    serviceEndsAt: row.serviceEndsAt,
    totalAmount: row.totalAmount,
    depositAmount: row.depositAmount,
    depositVerified: row.paymentStatus === "VERIFIED",
    serviceId: row.serviceId,
    serviceName: row.service.name,
    categoryName: row.service.category?.name ?? null,
    customerKey: normaliseCustomer(row.customerPhone),
    isNewCustomer: false,
  }));

  await markNewCustomers(providerId, appointments, from);

  return {
    metrics: computeMetrics(appointments, {
      timezone,
      dates: eachLocalDate(period.from, period.to),
      now,
    }),
    appointments,
  };
}

/**
 * A customer is new when this provider had no earlier appointment with that
 * number. One grouped query answers it for the whole period.
 */
async function markNewCustomers(
  providerId: string,
  appointments: ReportAppointment[],
  periodStart: Date,
): Promise<void> {
  const keys = Array.from(new Set(appointments.map((a) => a.customerKey)));
  if (keys.length === 0) return;

  const earlier = await prisma.appointment.findMany({
    where: { providerId, startsAt: { lt: periodStart } },
    select: { customerPhone: true },
    distinct: ["customerPhone"],
  });

  const known = new Set(earlier.map((row) => normaliseCustomer(row.customerPhone)));

  for (const appointment of appointments) {
    appointment.isNewCustomer = !known.has(appointment.customerKey);
  }
}

/** Phone numbers are written many ways; compare on digits only. */
function normaliseCustomer(phone: string): string {
  return phone.replace(/[^0-9]/g, "") || phone.trim().toLowerCase();
}

/** Occupancy: honoured minutes over the minutes actually open in the period. */
export async function computeOpenMinutes(
  providerId: string,
  period: Period,
  timezone: string,
): Promise<number> {
  const rules = await prisma.workingHours.findMany({
    where: { providerId, active: true },
  });

  if (rules.length === 0) return 0;

  const byDay = new Map(rules.map((rule) => [rule.dayOfWeek, rule]));
  let minutes = 0;

  for (const date of eachLocalDate(period.from, period.to)) {
    // localDayOfWeek resolves the weekday through the timezone database
    // rather than by guessing from a UTC offset.
    const rule = byDay.get(localDayOfWeek(date, timezone));
    if (!rule) continue;

    const open = Math.max(0, rule.closeMinute - rule.openMinute);
    const pause =
      rule.breakStartMinute != null && rule.breakEndMinute != null
        ? Math.max(0, rule.breakEndMinute - rule.breakStartMinute)
        : 0;

    minutes += Math.max(0, open - pause);
  }

  return minutes;
}

export type { LocalDate };
