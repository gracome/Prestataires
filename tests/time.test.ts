import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachLocalDate,
  formatDurationFr,
  formatLocalTime,
  formatMinuteOfDay,
  isLocalDate,
  localDateTimeToUtc,
  localDayOfWeek,
  minutesFromLocalMidnight,
  overlaps,
  parseMinuteOfDay,
  toLocalDate,
  type LocalDate,
} from "@/lib/time";

const COTONOU = "Africa/Porto-Novo"; // UTC+1, no daylight saving.
const PARIS = "Europe/Paris"; // UTC+1 in winter, UTC+2 in summer.

describe("local date arithmetic", () => {
  it("validates the date shape", () => {
    expect(isLocalDate("2025-06-03")).toBe(true);
    expect(isLocalDate("2025-13-01")).toBe(false);
    expect(isLocalDate("2025-02-30")).toBe(false);
    expect(isLocalDate("03/06/2025")).toBe(false);
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2025-01-31", 1)).toBe("2025-02-01");
    expect(addDays("2025-03-01", -1)).toBe("2025-02-28");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("counts days across month and year boundaries", () => {
    expect(daysBetween("2025-01-31", "2025-02-01")).toBe(1);
    expect(daysBetween("2024-12-31", "2025-01-01")).toBe(1);
    expect(daysBetween("2025-06-03", "2025-06-03")).toBe(0);
    expect(daysBetween("2025-06-10", "2025-06-03")).toBe(-7);
  });

  it("enumerates an inclusive range", () => {
    expect(eachLocalDate("2025-06-01", "2025-06-04")).toEqual([
      "2025-06-01",
      "2025-06-02",
      "2025-06-03",
      "2025-06-04",
    ]);
  });
});

describe("timezone conversion", () => {
  it("turns a local wall time into the right UTC instant", () => {
    // 09:00 in Cotonou is 08:00 UTC all year.
    expect(localDateTimeToUtc("2025-06-03", 9 * 60, COTONOU).toISOString()).toBe(
      "2025-06-03T08:00:00.000Z",
    );
  });

  it("follows daylight saving where it applies", () => {
    // Paris is UTC+1 in January and UTC+2 in July.
    expect(localDateTimeToUtc("2025-01-15", 9 * 60, PARIS).toISOString()).toBe(
      "2025-01-15T08:00:00.000Z",
    );
    expect(localDateTimeToUtc("2025-07-15", 9 * 60, PARIS).toISOString()).toBe(
      "2025-07-15T07:00:00.000Z",
    );
  });

  it("rolls a minute offset past midnight into the next day", () => {
    expect(localDateTimeToUtc("2025-06-03", 25 * 60, COTONOU).toISOString()).toBe(
      "2025-06-04T00:00:00.000Z",
    );
  });

  it("round-trips an instant back to its local date and minutes", () => {
    const instant = localDateTimeToUtc("2025-06-03", 14 * 60 + 30, COTONOU);
    expect(toLocalDate(instant, COTONOU)).toBe("2025-06-03");
    expect(minutesFromLocalMidnight(instant, COTONOU)).toBe(14 * 60 + 30);
    expect(formatLocalTime(instant, COTONOU)).toBe("14:30");
  });

  it("puts a late-evening instant on the right local day", () => {
    // 23:30 in Cotonou on 3 June is 22:30 UTC the same day.
    const instant = localDateTimeToUtc("2025-06-03", 23 * 60 + 30, COTONOU);
    expect(instant.toISOString()).toBe("2025-06-03T22:30:00.000Z");
    expect(toLocalDate(instant, COTONOU)).toBe("2025-06-03");
  });

  it("reports the local weekday with Sunday as zero", () => {
    // 2025-06-01 is a Sunday, 2025-06-03 a Tuesday.
    expect(localDayOfWeek("2025-06-01" as LocalDate, COTONOU)).toBe(0);
    expect(localDayOfWeek("2025-06-03" as LocalDate, COTONOU)).toBe(2);
    expect(localDayOfWeek("2025-06-07" as LocalDate, COTONOU)).toBe(6);
  });
});

describe("minute-of-day formatting", () => {
  it("formats and parses symmetrically", () => {
    expect(formatMinuteOfDay(540)).toBe("09:00");
    expect(formatMinuteOfDay(1080)).toBe("18:00");
    expect(parseMinuteOfDay("09:00")).toBe(540);
    expect(parseMinuteOfDay("18:30")).toBe(1110);
  });

  it("rejects malformed times", () => {
    expect(() => parseMinuteOfDay("9h00")).toThrow();
    expect(() => parseMinuteOfDay("25:00")).toThrow();
    expect(() => parseMinuteOfDay("12:75")).toThrow();
  });
});

describe("overlap", () => {
  const t = (hour: number) => new Date(Date.UTC(2025, 5, 3, hour));

  it("is half-open so touching ranges do not overlap", () => {
    expect(overlaps(t(10), t(11), t(11), t(12))).toBe(false);
    expect(overlaps(t(11), t(12), t(10), t(11))).toBe(false);
  });

  it("detects a real overlap in both directions", () => {
    expect(overlaps(t(10), t(12), t(11), t(13))).toBe(true);
    expect(overlaps(t(11), t(13), t(10), t(12))).toBe(true);
  });

  it("detects containment", () => {
    expect(overlaps(t(9), t(18), t(11), t(12))).toBe(true);
    expect(overlaps(t(11), t(12), t(9), t(18))).toBe(true);
  });
});

describe("duration formatting", () => {
  it("writes durations the way a French speaker reads them", () => {
    expect(formatDurationFr(30)).toBe("30 min");
    expect(formatDurationFr(60)).toBe("1 h");
    expect(formatDurationFr(90)).toBe("1 h 30");
    expect(formatDurationFr(125)).toBe("2 h 05");
  });
});
