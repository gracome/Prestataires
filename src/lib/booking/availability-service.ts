import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addDays,
  addMinutes,
  eachLocalDate,
  toLocalDate,
  localDateTimeToUtc,
  type LocalDate,
} from "@/lib/time";
import { BLOCKING_STATUSES } from "./state-machine";
import {
  computeAvailability,
  isSlotBookable,
  type BusyInterval,
  type DayAvailability,
  type ServiceTiming,
  type SlotRules,
  type WorkingHoursRule,
} from "./availability";
import { releaseExpiredAppointments } from "./expiration";

/**
 * Loads opening rules and busy time from the database and hands them to the
 * pure engine in availability.ts.
 */

export type AvailabilityContext = {
  providerId: string;
  timezone: string;
  rules: SlotRules;
  workingHours: WorkingHoursRule[];
  service: ServiceTiming;
};

export class AvailabilityError extends Error {
  constructor(
    message: string,
    readonly code:
      | "PROVIDER_NOT_FOUND"
      | "SERVICE_NOT_FOUND"
      | "BOOKING_DISABLED"
      | "QUOTE_ONLY",
  ) {
    super(message);
    this.name = "AvailabilityError";
  }
}

export async function loadAvailabilityContext(
  providerId: string,
  serviceId: string,
): Promise<AvailabilityContext> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { bookingSettings: true, workingHours: true },
  });

  if (!provider || provider.status !== "ACTIVE") {
    throw new AvailabilityError("Provider unavailable", "PROVIDER_NOT_FOUND");
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId, active: true },
  });

  if (!service) {
    throw new AvailabilityError("Service unavailable", "SERVICE_NOT_FOUND");
  }

  if (service.priceType === "QUOTE_ONLY") {
    throw new AvailabilityError(
      "This service is quote-only and cannot be booked directly",
      "QUOTE_ONLY",
    );
  }

  const settings = provider.bookingSettings;

  return {
    providerId,
    timezone: provider.timezone,
    service: {
      durationMinutes: service.durationMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    },
    rules: {
      slotGranularityMinutes: settings?.slotGranularityMinutes ?? 30,
      bufferAfterMinutes: settings?.bufferAfterMinutes ?? 0,
      minLeadTimeMinutes: settings?.minLeadTimeMinutes ?? 120,
      maxAdvanceDays: settings?.maxAdvanceDays ?? 60,
      bookingEnabled: settings?.bookingEnabled ?? true,
    },
    workingHours: provider.workingHours.map((wh) => ({
      dayOfWeek: wh.dayOfWeek,
      openMinute: wh.openMinute,
      closeMinute: wh.closeMinute,
      breakStartMinute: wh.breakStartMinute,
      breakEndMinute: wh.breakEndMinute,
      active: wh.active,
    })),
  };
}

/**
 * Busy intervals overlapping [from, to): blocking appointments plus every
 * kind of time block, including periods mirrored from Google Calendar.
 */
export async function loadBusyIntervals(
  providerId: string,
  from: Date,
  to: Date,
  options: { excludeAppointmentId?: string; tx?: Prisma.TransactionClient } = {},
): Promise<BusyInterval[]> {
  const client = options.tx ?? prisma;

  const [appointments, blocks] = await Promise.all([
    client.appointment.findMany({
      where: {
        providerId,
        status: { in: [...BLOCKING_STATUSES] },
        startsAt: { lt: to },
        endsAt: { gt: from },
        ...(options.excludeAppointmentId
          ? { id: { not: options.excludeAppointmentId } }
          : {}),
      },
      select: { startsAt: true, endsAt: true, status: true },
    }),
    client.timeBlock.findMany({
      where: {
        providerId,
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { startsAt: true, endsAt: true, type: true },
    }),
  ]);

  const intervals: BusyInterval[] = [];

  for (const appointment of appointments) {
    intervals.push({
      start: appointment.startsAt,
      end: appointment.endsAt,
      source:
        appointment.status === "TEMPORARILY_RESERVED" ||
        appointment.status === "AWAITING_PAYMENT" ||
        appointment.status === "PAYMENT_PROOF_SUBMITTED"
          ? "HOLD"
          : "APPOINTMENT",
    });
  }

  for (const block of blocks) {
    intervals.push({
      start: block.startsAt,
      end: block.endsAt,
      source:
        block.type === "EXTERNAL_CALENDAR" ? "EXTERNAL_CALENDAR" : "TIME_BLOCK",
    });
  }

  return intervals;
}

export type AvailabilityRange = {
  from: LocalDate;
  to: LocalDate;
};

/**
 * Availability for a date range. Expired holds are released first, so a slot
 * abandoned by another customer reappears without waiting for the cron job.
 */
export async function getAvailability(
  providerId: string,
  serviceId: string,
  range: AvailabilityRange,
  now = new Date(),
): Promise<{ timezone: string; days: DayAvailability[] }> {
  await releaseExpiredAppointments({ providerId, now });

  const context = await loadAvailabilityContext(providerId, serviceId);
  const dates = eachLocalDate(range.from, range.to);

  const windowStart = localDateTimeToUtc(range.from, 0, context.timezone);
  const windowEnd = localDateTimeToUtc(addDays(range.to, 1), 0, context.timezone);

  const busy = await loadBusyIntervals(providerId, windowStart, windowEnd);

  const days = computeAvailability({
    dates,
    timezone: context.timezone,
    now,
    service: context.service,
    rules: context.rules,
    workingHours: context.workingHours,
    busy,
  });

  return { timezone: context.timezone, days };
}

/** Default range shown when a customer opens the booking page. */
export function defaultRange(
  timezone: string,
  now = new Date(),
  days = 14,
): AvailabilityRange {
  const from = toLocalDate(now, timezone);
  return { from, to: addDays(from, days - 1) };
}

/**
 * Re-check one candidate start immediately before writing. This is the
 * application-level guard; the database exclusion constraint is the one that
 * actually settles a race between two simultaneous bookings.
 */
export async function verifySlotStillFree(
  context: AvailabilityContext,
  startsAt: Date,
  options: { now?: Date; tx?: Prisma.TransactionClient } = {},
): Promise<boolean> {
  const now = options.now ?? new Date();
  const windowStart = addMinutes(startsAt, -24 * 60);
  const windowEnd = addMinutes(startsAt, 24 * 60);

  const busy = await loadBusyIntervals(
    context.providerId,
    windowStart,
    windowEnd,
    { tx: options.tx },
  );

  return isSlotBookable(startsAt, {
    timezone: context.timezone,
    now,
    service: context.service,
    rules: context.rules,
    workingHours: context.workingHours,
    busy,
  });
}
