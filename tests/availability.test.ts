import { describe, expect, it } from "vitest";
import {
  computeAvailability,
  computeWindow,
  effectiveBuffer,
  isSlotBookable,
  mergeIntervals,
  openWindowsFor,
  reservedMinutes,
  type BusyInterval,
  type SlotRules,
  type WorkingHoursRule,
} from "@/lib/booking/availability";
import { localDateTimeToUtc, type LocalDate } from "@/lib/time";

/**
 * The availability engine is the part of the system a mistake would hurt most:
 * it decides what gets offered and therefore what can be double-booked.
 */

const TZ = "Africa/Porto-Novo"; // UTC+1 all year, no daylight saving.

const RULES: SlotRules = {
  slotGranularityMinutes: 30,
  bufferAfterMinutes: 0,
  minLeadTimeMinutes: 0,
  maxAdvanceDays: 60,
  bookingEnabled: true,
};

/** Tuesday 2025-06-03 is a weekday in every timezone used here. */
const TUESDAY: LocalDate = "2025-06-03";
const WEDNESDAY: LocalDate = "2025-06-04";

function openAllWeek(overrides: Partial<WorkingHoursRule> = {}): WorkingHoursRule[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openMinute: 9 * 60,
    closeMinute: 18 * 60,
    breakStartMinute: null,
    breakEndMinute: null,
    active: true,
    ...overrides,
  }));
}

/** An instant on the given local date, at HH:MM provider-local. */
function at(date: LocalDate, hours: number, minutes = 0): Date {
  return localDateTimeToUtc(date, hours * 60 + minutes, TZ);
}

describe("openWindowsFor", () => {
  it("returns nothing for a closed day", () => {
    expect(
      openWindowsFor({
        dayOfWeek: 1,
        openMinute: 540,
        closeMinute: 1080,
        breakStartMinute: null,
        breakEndMinute: null,
        active: false,
      }),
    ).toEqual([]);
  });

  it("splits the day around a break", () => {
    const windows = openWindowsFor({
      dayOfWeek: 2,
      openMinute: 9 * 60,
      closeMinute: 18 * 60,
      breakStartMinute: 13 * 60,
      breakEndMinute: 14 * 60,
      active: true,
    });

    expect(windows).toEqual([
      { startMinute: 540, endMinute: 780 },
      { startMinute: 840, endMinute: 1080 },
    ]);
  });

  it("treats a closing time before the opening time as running past midnight", () => {
    const windows = openWindowsFor({
      dayOfWeek: 5,
      openMinute: 20 * 60,
      closeMinute: 2 * 60,
      breakStartMinute: null,
      breakEndMinute: null,
      active: true,
    });

    expect(windows).toEqual([{ startMinute: 1200, endMinute: 1560 }]);
  });
});

describe("mergeIntervals", () => {
  it("merges overlapping and touching ranges", () => {
    const merged = mergeIntervals([
      { start: at(TUESDAY, 10), end: at(TUESDAY, 11), source: "APPOINTMENT" },
      { start: at(TUESDAY, 10, 30), end: at(TUESDAY, 12), source: "HOLD" },
      { start: at(TUESDAY, 12), end: at(TUESDAY, 13), source: "TIME_BLOCK" },
      { start: at(TUESDAY, 15), end: at(TUESDAY, 16), source: "APPOINTMENT" },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0].start).toEqual(at(TUESDAY, 10));
    expect(merged[0].end).toEqual(at(TUESDAY, 13));
    expect(merged[1].start).toEqual(at(TUESDAY, 15));
  });

  it("keeps a shorter range nested inside a longer one from extending it", () => {
    const merged = mergeIntervals([
      { start: at(TUESDAY, 9), end: at(TUESDAY, 18), source: "TIME_BLOCK" },
      { start: at(TUESDAY, 10), end: at(TUESDAY, 11), source: "APPOINTMENT" },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].end).toEqual(at(TUESDAY, 18));
  });
});

describe("computeWindow and buffers", () => {
  it("adds the larger of the service and provider buffers", () => {
    const service = { durationMinutes: 90, bufferAfterMinutes: 10 };
    expect(effectiveBuffer(service, { bufferAfterMinutes: 5 })).toBe(10);
    expect(effectiveBuffer(service, { bufferAfterMinutes: 20 })).toBe(20);
    expect(reservedMinutes(service, { bufferAfterMinutes: 20 })).toBe(110);
  });

  it("separates the customer-facing end from the reserved end", () => {
    const window = computeWindow(
      at(TUESDAY, 15),
      { durationMinutes: 90, bufferAfterMinutes: 15 },
      { bufferAfterMinutes: 0 },
    );

    expect(window.serviceEndsAt).toEqual(at(TUESDAY, 16, 30));
    expect(window.endsAt).toEqual(at(TUESDAY, 16, 45));
  });
});

describe("computeAvailability", () => {
  const service = { durationMinutes: 60, bufferAfterMinutes: 0 };

  it("offers slots on the granularity grid and stops in time to close", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service,
      rules: RULES,
      workingHours: openAllWeek(),
      busy: [],
    });

    expect(day.isOpen).toBe(true);
    // 09:00 through 17:00 inclusive, every 30 minutes.
    expect(day.slots).toHaveLength(17);
    expect(day.slots[0].startsAt).toEqual(at(TUESDAY, 9));
    expect(day.slots.at(-1)?.startsAt).toEqual(at(TUESDAY, 17));
  });

  it("does not offer a slot that would run past closing time", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service: { durationMinutes: 120, bufferAfterMinutes: 0 },
      rules: RULES,
      workingHours: openAllWeek(),
      busy: [],
    });

    expect(day.slots.at(-1)?.startsAt).toEqual(at(TUESDAY, 16));
  });

  it("reports a closed day as closed with no slots", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service,
      rules: RULES,
      workingHours: openAllWeek({ active: false }),
      busy: [],
    });

    expect(day.isOpen).toBe(false);
    expect(day.slots).toEqual([]);
  });

  it("removes the break from the offered slots", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service,
      rules: RULES,
      workingHours: openAllWeek({
        breakStartMinute: 13 * 60,
        breakEndMinute: 14 * 60,
      }),
      busy: [],
    });

    const starts = day.slots.map((slot) => slot.startsAt.toISOString());
    expect(starts).not.toContain(at(TUESDAY, 12, 30).toISOString());
    expect(starts).not.toContain(at(TUESDAY, 13).toISOString());
    expect(starts).toContain(at(TUESDAY, 14).toISOString());
  });

  it("hides slots overlapping an existing appointment", () => {
    const busy: BusyInterval[] = [
      { start: at(TUESDAY, 15), end: at(TUESDAY, 16, 30), source: "APPOINTMENT" },
    ];

    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service,
      rules: RULES,
      workingHours: openAllWeek(),
      busy,
    });

    const starts = day.slots.map((slot) => slot.startsAt.toISOString());
    expect(starts).not.toContain(at(TUESDAY, 14, 30).toISOString());
    expect(starts).not.toContain(at(TUESDAY, 15).toISOString());
    expect(starts).not.toContain(at(TUESDAY, 16).toISOString());
    expect(starts).toContain(at(TUESDAY, 14).toISOString());
    expect(starts).toContain(at(TUESDAY, 16, 30).toISOString());
  });

  it("treats a live hold exactly like a confirmed appointment", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service,
      rules: RULES,
      workingHours: openAllWeek(),
      busy: [{ start: at(TUESDAY, 11), end: at(TUESDAY, 12), source: "HOLD" }],
    });

    const starts = day.slots.map((slot) => slot.startsAt.toISOString());
    expect(starts).not.toContain(at(TUESDAY, 11).toISOString());
  });

  it("lets a booking start exactly when another ends", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service,
      rules: RULES,
      workingHours: openAllWeek(),
      busy: [{ start: at(TUESDAY, 10), end: at(TUESDAY, 11), source: "APPOINTMENT" }],
    });

    const starts = day.slots.map((slot) => slot.startsAt.toISOString());
    expect(starts).toContain(at(TUESDAY, 11).toISOString());
  });

  it("respects the minimum lead time", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 9),
      service,
      rules: { ...RULES, minLeadTimeMinutes: 120 },
      workingHours: openAllWeek(),
      busy: [],
    });

    expect(day.slots[0].startsAt).toEqual(at(TUESDAY, 11));
  });

  it("respects the booking horizon", () => {
    const [day] = computeAvailability({
      dates: [WEDNESDAY],
      timezone: TZ,
      now: at(TUESDAY, 9),
      service,
      rules: { ...RULES, maxAdvanceDays: 0 },
      workingHours: openAllWeek(),
      busy: [],
    });

    expect(day.slots).toEqual([]);
  });

  it("offers nothing when booking is switched off", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service,
      rules: { ...RULES, bookingEnabled: false },
      workingHours: openAllWeek(),
      busy: [],
    });

    expect(day.isOpen).toBe(false);
    expect(day.slots).toEqual([]);
  });

  it("accounts for the buffer when deciding what still fits", () => {
    const [day] = computeAvailability({
      dates: [TUESDAY],
      timezone: TZ,
      now: at(TUESDAY, 0),
      service: { durationMinutes: 60, bufferAfterMinutes: 30 },
      rules: RULES,
      workingHours: openAllWeek(),
      busy: [],
    });

    // A 17:00 start would run to 18:30 with the buffer, past closing.
    expect(day.slots.at(-1)?.startsAt).toEqual(at(TUESDAY, 16, 30));
  });
});

describe("isSlotBookable", () => {
  const service = { durationMinutes: 60, bufferAfterMinutes: 0 };
  const base = {
    timezone: TZ,
    now: at(TUESDAY, 0),
    service,
    rules: RULES,
    workingHours: openAllWeek(),
    busy: [] as BusyInterval[],
  };

  it("accepts a slot the day view would have offered", () => {
    expect(isSlotBookable(at(TUESDAY, 15), base)).toBe(true);
  });

  it("rejects a start that is off the published grid", () => {
    expect(isSlotBookable(at(TUESDAY, 15, 10), base)).toBe(false);
  });

  it("rejects a start outside the opening hours", () => {
    expect(isSlotBookable(at(TUESDAY, 8), base)).toBe(false);
    expect(isSlotBookable(at(TUESDAY, 20), base)).toBe(false);
  });

  it("rejects a start that collides with a busy period", () => {
    expect(
      isSlotBookable(at(TUESDAY, 15), {
        ...base,
        busy: [
          { start: at(TUESDAY, 15, 30), end: at(TUESDAY, 16), source: "TIME_BLOCK" },
        ],
      }),
    ).toBe(false);
  });

  it("rejects a start on a closed day", () => {
    expect(
      isSlotBookable(at(TUESDAY, 15), {
        ...base,
        workingHours: openAllWeek({ active: false }),
      }),
    ).toBe(false);
  });

  it("rejects a start inside the lead time", () => {
    expect(
      isSlotBookable(at(TUESDAY, 10), {
        ...base,
        now: at(TUESDAY, 9),
        rules: { ...RULES, minLeadTimeMinutes: 120 },
      }),
    ).toBe(false);
  });
});
