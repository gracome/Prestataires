import {
  addMinutes,
  localDateTimeToUtc,
  localDayOfWeek,
  overlaps,
  type LocalDate,
} from "@/lib/time";

/**
 * Slot computation (cahier des charges section 15).
 *
 * This module is deliberately pure: it takes opening rules and busy intervals
 * and returns slots. Loading those inputs is the job of availability-service.ts,
 * which keeps the arithmetic testable without a database.
 *
 * A slot is offered only when every one of these holds:
 *   1. the provider works that weekday;
 *   2. the slot sits inside the opening window, outside the break;
 *   3. the full service duration plus buffer fits before closing;
 *   4. no appointment in a blocking status overlaps it;
 *   5. no time block (day off, holiday, manual block) overlaps it;
 *   6. no Google Calendar busy period overlaps it;
 *   7. no live temporary hold overlaps it;
 *   8. it respects the minimum lead time and the booking horizon.
 */

export type WorkingHoursRule = {
  dayOfWeek: number;
  openMinute: number;
  closeMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
  active: boolean;
};

export type BusySource =
  | "APPOINTMENT"
  | "HOLD"
  | "TIME_BLOCK"
  | "EXTERNAL_CALENDAR";

export type BusyInterval = {
  start: Date;
  end: Date;
  source: BusySource;
};

export type ServiceTiming = {
  durationMinutes: number;
  bufferAfterMinutes: number;
};

export type SlotRules = {
  slotGranularityMinutes: number;
  /** Provider-wide gap kept after every appointment. */
  bufferAfterMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  bookingEnabled: boolean;
};

export type Slot = {
  /** Start of the reserved window, which is what the customer picks. */
  startsAt: Date;
  /** End of the service itself, shown to the customer. */
  serviceEndsAt: Date;
  /** End of the reserved window, buffer included. */
  endsAt: Date;
};

export type DayAvailability = {
  date: LocalDate;
  /** True when the provider works that day at all. */
  isOpen: boolean;
  slots: Slot[];
};

/**
 * Minutes reserved after the service. The service-level buffer and the
 * provider-wide buffer are not added together: the larger one wins, so a
 * service that already declares a long cleanup is not penalised twice.
 */
export function effectiveBuffer(
  service: ServiceTiming,
  rules: Pick<SlotRules, "bufferAfterMinutes">,
): number {
  return Math.max(service.bufferAfterMinutes ?? 0, rules.bufferAfterMinutes ?? 0);
}

/** Total minutes a booking removes from the calendar. */
export function reservedMinutes(
  service: ServiceTiming,
  rules: Pick<SlotRules, "bufferAfterMinutes">,
): number {
  return service.durationMinutes + effectiveBuffer(service, rules);
}

/** The three timestamps stored on an appointment for a chosen start. */
export function computeWindow(
  startsAt: Date,
  service: ServiceTiming,
  rules: Pick<SlotRules, "bufferAfterMinutes">,
): Slot {
  const serviceEndsAt = addMinutes(startsAt, service.durationMinutes);
  const endsAt = addMinutes(serviceEndsAt, effectiveBuffer(service, rules));
  return { startsAt, serviceEndsAt, endsAt };
}

type OpenWindow = { startMinute: number; endMinute: number };

/**
 * Opening minutes for a weekday, split around the break.
 * A close time at or before the open time is read as closing after midnight.
 */
export function openWindowsFor(rule: WorkingHoursRule): OpenWindow[] {
  if (!rule.active) return [];

  const open = rule.openMinute;
  const close = rule.closeMinute <= rule.openMinute
    ? rule.closeMinute + 24 * 60
    : rule.closeMinute;

  if (close <= open) return [];

  const hasBreak =
    rule.breakStartMinute !== null &&
    rule.breakEndMinute !== null &&
    rule.breakEndMinute > rule.breakStartMinute;

  if (!hasBreak) return [{ startMinute: open, endMinute: close }];

  const breakStart = Math.max(open, rule.breakStartMinute as number);
  const breakEnd = Math.min(close, rule.breakEndMinute as number);

  if (breakStart >= close || breakEnd <= open) {
    return [{ startMinute: open, endMinute: close }];
  }

  const windows: OpenWindow[] = [];
  if (breakStart > open) windows.push({ startMinute: open, endMinute: breakStart });
  if (close > breakEnd) windows.push({ startMinute: breakEnd, endMinute: close });
  return windows;
}

/** Sort and merge overlapping or touching intervals. */
export function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const merged: BusyInterval[] = [sorted[0]];
  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      if (current.end > last.end) {
        merged[merged.length - 1] = {
          start: last.start,
          end: current.end,
          source: last.source,
        };
      }
    } else {
      merged.push(current);
    }
  }
  return merged;
}

export type ComputeSlotsInput = {
  dates: LocalDate[];
  timezone: string;
  now: Date;
  service: ServiceTiming;
  rules: SlotRules;
  workingHours: WorkingHoursRule[];
  busy: BusyInterval[];
};

export function computeAvailability(
  input: ComputeSlotsInput,
): DayAvailability[] {
  const { dates, timezone, now, service, rules, workingHours } = input;

  if (!rules.bookingEnabled || service.durationMinutes <= 0) {
    return dates.map((date) => ({ date, isOpen: false, slots: [] }));
  }

  const rulesByDay = new Map<number, WorkingHoursRule>();
  for (const rule of workingHours) rulesByDay.set(rule.dayOfWeek, rule);

  const busy = mergeIntervals(input.busy);
  const step = Math.max(5, rules.slotGranularityMinutes);
  const duration = reservedMinutes(service, rules);

  const earliest = addMinutes(now, Math.max(0, rules.minLeadTimeMinutes));
  const horizon = addMinutes(now, rules.maxAdvanceDays * 24 * 60);

  return dates.map((date) => {
    const rule = rulesByDay.get(localDayOfWeek(date, timezone));
    if (!rule || !rule.active) return { date, isOpen: false, slots: [] };

    const windows = openWindowsFor(rule);
    if (windows.length === 0) return { date, isOpen: false, slots: [] };

    const slots: Slot[] = [];

    for (const window of windows) {
      for (
        let minute = window.startMinute;
        minute + duration <= window.endMinute;
        minute += step
      ) {
        const startsAt = localDateTimeToUtc(date, minute, timezone);
        if (startsAt < earliest || startsAt > horizon) continue;

        const slot = computeWindow(startsAt, service, rules);
        if (isBusy(slot, busy)) continue;

        slots.push(slot);
      }
    }

    return { date, isOpen: true, slots };
  });
}

function isBusy(slot: Slot, busy: BusyInterval[]): boolean {
  for (const interval of busy) {
    // Sorted: once an interval starts after the slot ends, none can overlap.
    if (interval.start >= slot.endsAt) return false;
    if (overlaps(slot.startsAt, slot.endsAt, interval.start, interval.end)) {
      return true;
    }
  }
  return false;
}

/**
 * Whether one specific start is still bookable. Used at commit time, where
 * the question is about a single candidate rather than a whole day.
 */
export function isSlotBookable(
  startsAt: Date,
  input: Omit<ComputeSlotsInput, "dates">,
): boolean {
  const { timezone, now, service, rules, workingHours } = input;
  if (!rules.bookingEnabled || service.durationMinutes <= 0) return false;

  const earliest = addMinutes(now, Math.max(0, rules.minLeadTimeMinutes));
  const horizon = addMinutes(now, rules.maxAdvanceDays * 24 * 60);
  if (startsAt < earliest || startsAt > horizon) return false;

  const slot = computeWindow(startsAt, service, rules);

  if (!fitsOpeningHours(slot, timezone, workingHours, rules)) return false;

  return !isBusy(slot, mergeIntervals(input.busy));
}

/**
 * Check the reserved window against the weekly rules. The window is tested
 * against the day it starts on and, when it runs past midnight, against the
 * previous day's late-closing window too.
 */
function fitsOpeningHours(
  slot: Slot,
  timezone: string,
  workingHours: WorkingHoursRule[],
  rules: SlotRules,
): boolean {
  const rulesByDay = new Map<number, WorkingHoursRule>();
  for (const rule of workingHours) rulesByDay.set(rule.dayOfWeek, rule);

  // Candidate anchor days: the local date the slot starts on, and the day
  // before it, whose window may extend past midnight.
  const startDate = localDateOf(slot.startsAt, timezone);
  const candidates: LocalDate[] = [startDate, previousDate(startDate)];

  for (const date of candidates) {
    const rule = rulesByDay.get(localDayOfWeek(date, timezone));
    if (!rule || !rule.active) continue;

    for (const window of openWindowsFor(rule)) {
      const windowStart = localDateTimeToUtc(date, window.startMinute, timezone);
      const windowEnd = localDateTimeToUtc(date, window.endMinute, timezone);
      if (slot.startsAt >= windowStart && slot.endsAt <= windowEnd) {
        // Also confirm the start sits on the published grid.
        const step = Math.max(5, rules.slotGranularityMinutes);
        const offset = Math.round(
          (slot.startsAt.getTime() - windowStart.getTime()) / 60_000,
        );
        if (offset % step === 0) return true;
      }
    }
  }
  return false;
}

function localDateOf(instant: Date, timezone: string): LocalDate {
  // Local import avoids a cycle with time.ts helpers used above.
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  return iso as LocalDate;
}

function previousDate(date: LocalDate): LocalDate {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d - 1));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-") as LocalDate;
}
