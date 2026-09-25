import { describe, expect, it } from "vitest";
import {
  PERIOD_PRESETS,
  periodQuery,
  previousPeriod,
  resolvePeriod,
} from "@/lib/reports/period";
import {
  compare,
  computeMetrics,
  type ReportAppointment,
} from "@/lib/reports/metrics";
import { eachLocalDate, type LocalDate } from "@/lib/time";

/**
 * Reports drive decisions about prices and opening hours, so a wrong figure is
 * worse than no figure. These cover the period arithmetic and every rule that
 * decides whether an appointment counts as earned, expected or lost.
 */

const TZ = "Africa/Porto-Novo";
// A Wednesday, comfortably inside a month.
const NOW = new Date("2026-09-16T10:00:00.000Z");

describe("resolvePeriod", () => {
  it("defaults to the last thirty days", () => {
    const period = resolvePeriod({}, TZ, NOW);
    expect(period.preset).toBe("30j");
    expect(period.to).toBe("2026-09-16");
    expect(period.from).toBe("2026-08-18");
    expect(period.days).toBe(30);
  });

  it("covers the last seven days including today", () => {
    const period = resolvePeriod({ periode: "7j" }, TZ, NOW);
    expect(period.from).toBe("2026-09-10");
    expect(period.to).toBe("2026-09-16");
    expect(period.days).toBe(7);
  });

  it("runs the current month from the first to today", () => {
    const period = resolvePeriod({ periode: "mois" }, TZ, NOW);
    expect(period.from).toBe("2026-09-01");
    expect(period.to).toBe("2026-09-16");
    expect(period.label).toBe("septembre 2026");
  });

  it("covers the previous month end to end", () => {
    const period = resolvePeriod({ periode: "mois-dernier" }, TZ, NOW);
    expect(period.from).toBe("2026-08-01");
    expect(period.to).toBe("2026-08-31");
    expect(period.label).toBe("août 2026");
  });

  it("starts the year period on 1 January", () => {
    const period = resolvePeriod({ periode: "annee" }, TZ, NOW);
    expect(period.from).toBe("2026-01-01");
    expect(period.to).toBe("2026-09-16");
  });

  it("accepts a custom range", () => {
    const period = resolvePeriod(
      { periode: "personnalise", du: "2026-03-01", au: "2026-03-31" },
      TZ,
      NOW,
    );
    expect(period.days).toBe(31);
    expect(period.label).toBe("Du 1 mars 2026 au 31 mars 2026");
  });

  it("swaps a reversed custom range instead of failing", () => {
    const period = resolvePeriod(
      { periode: "personnalise", du: "2026-03-31", au: "2026-03-01" },
      TZ,
      NOW,
    );
    expect(period.from).toBe("2026-03-01");
    expect(period.to).toBe("2026-03-31");
  });

  it("falls back on a malformed range rather than erroring", () => {
    const period = resolvePeriod(
      { periode: "personnalise", du: "hier", au: "demain" },
      TZ,
      NOW,
    );
    expect(period.from).toBe("2026-08-18");
    expect(period.to).toBe("2026-09-16");
  });

  it("falls back on an unknown preset", () => {
    expect(resolvePeriod({ periode: "n-importe-quoi" }, TZ, NOW).preset).toBe("30j");
  });

  it("round-trips every preset through its query string", () => {
    for (const { value } of PERIOD_PRESETS) {
      const period = resolvePeriod({ periode: value }, TZ, NOW);
      expect(periodQuery(period)).toBe(`periode=${value}`);
    }
  });
});

describe("previousPeriod", () => {
  it("takes the same number of days immediately before", () => {
    const period = resolvePeriod({ periode: "7j" }, TZ, NOW);
    const previous = previousPeriod(period);
    expect(previous.to).toBe("2026-09-09");
    expect(previous.from).toBe("2026-09-03");
    expect(previous.days).toBe(period.days);
  });

  it("compares a month in progress against the same slice of the month before", () => {
    // Sixteen days into September must not be measured against all of August.
    const period = resolvePeriod({ periode: "mois" }, TZ, NOW);
    const previous = previousPeriod(period);
    expect(previous.from).toBe("2026-08-01");
    expect(previous.to).toBe("2026-08-16");
    expect(previous.days).toBe(period.days);
  });

  it("compares a finished month against the whole previous month", () => {
    const period = resolvePeriod({ periode: "mois-dernier" }, TZ, NOW);
    const previous = previousPeriod(period);
    expect(previous.from).toBe("2026-07-01");
    expect(previous.to).toBe("2026-07-31");
  });

  it("never overlaps the period it compares against", () => {
    for (const { value } of PERIOD_PRESETS) {
      const period = resolvePeriod({ periode: value }, TZ, NOW);
      expect(previousPeriod(period).to < period.from).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

const DATES = eachLocalDate("2026-09-01" as LocalDate, "2026-09-05" as LocalDate);

function appointment(
  overrides: Partial<ReportAppointment> & Pick<ReportAppointment, "status">,
): ReportAppointment {
  const startsAt = overrides.startsAt ?? new Date("2026-09-02T09:00:00.000Z");
  return {
    id: Math.random().toString(36).slice(2),
    startsAt,
    serviceEndsAt: new Date(startsAt.getTime() + 60 * 60_000),
    totalAmount: 8000,
    depositAmount: 3000,
    depositVerified: false,
    serviceId: "svc-1",
    serviceName: "Pose gel",
    categoryName: "Ongles",
    customerKey: "22997000001",
    isNewCustomer: false,
    ...overrides,
  };
}

const opts = { timezone: TZ, dates: DATES, now: new Date("2026-09-06T00:00:00.000Z") };

describe("computeMetrics", () => {
  it("counts a completed appointment as earned revenue", () => {
    const m = computeMetrics([appointment({ status: "COMPLETED" })], opts);
    expect(m.honoured).toBe(1);
    expect(m.revenue).toBe(8000);
    expect(m.expectedRevenue).toBe(0);
  });

  it("treats a confirmed appointment whose time has passed as done", () => {
    // The closing job may not have run yet; the money is still earned.
    const m = computeMetrics([appointment({ status: "CONFIRMED" })], opts);
    expect(m.honoured).toBe(1);
    expect(m.revenue).toBe(8000);
  });

  it("keeps a future confirmed appointment out of earned revenue", () => {
    const m = computeMetrics(
      [
        appointment({
          status: "CONFIRMED",
          startsAt: new Date("2026-09-05T09:00:00.000Z"),
          serviceEndsAt: new Date("2026-09-05T10:00:00.000Z"),
        }),
      ],
      { ...opts, now: new Date("2026-09-04T00:00:00.000Z") },
    );
    expect(m.honoured).toBe(0);
    expect(m.upcoming).toBe(1);
    expect(m.revenue).toBe(0);
    expect(m.expectedRevenue).toBe(8000);
  });

  it("never counts a cancelled or expired appointment as revenue", () => {
    const m = computeMetrics(
      [
        appointment({ status: "CANCELLED" }),
        appointment({ status: "EXPIRED" }),
        appointment({ status: "NO_SHOW" }),
        appointment({ status: "PAYMENT_REJECTED" }),
      ],
      opts,
    );
    expect(m.revenue).toBe(0);
    expect(m.cancelled).toBe(1);
    expect(m.expired).toBe(1);
    expect(m.noShow).toBe(1);
    expect(m.rejected).toBe(1);
  });

  it("leaves expired and rejected out of the booked denominator", () => {
    // They never became a real appointment, so they must not drag the
    // cancellation rate around.
    const m = computeMetrics(
      [
        appointment({ status: "COMPLETED" }),
        appointment({ status: "CANCELLED" }),
        appointment({ status: "EXPIRED" }),
        appointment({ status: "PAYMENT_REJECTED" }),
      ],
      opts,
    );
    expect(m.booked).toBe(2);
    expect(m.cancellationRate).toBeCloseTo(0.5, 5);
  });

  it("sums only the deposits actually verified", () => {
    const m = computeMetrics(
      [
        appointment({ status: "COMPLETED", depositVerified: true }),
        appointment({ status: "COMPLETED", depositVerified: false }),
      ],
      opts,
    );
    expect(m.depositsCollected).toBe(3000);
  });

  it("averages the basket over honoured appointments only", () => {
    const m = computeMetrics(
      [
        appointment({ status: "COMPLETED", totalAmount: 8000 }),
        appointment({ status: "COMPLETED", totalAmount: 4000 }),
        appointment({ status: "CANCELLED", totalAmount: 100000 }),
      ],
      opts,
    );
    expect(m.averageBasket).toBe(6000);
  });

  it("reports no average when nothing was honoured", () => {
    const m = computeMetrics([appointment({ status: "CANCELLED" })], opts);
    expect(m.averageBasket).toBe(0);
  });

  it("counts a customer once however many visits she made", () => {
    const m = computeMetrics(
      [
        appointment({ status: "COMPLETED" }),
        appointment({ status: "COMPLETED" }),
        appointment({ status: "COMPLETED", customerKey: "22997000002", isNewCustomer: true }),
      ],
      opts,
    );
    expect(m.customers).toBe(2);
    expect(m.newCustomers).toBe(1);
    expect(m.returningCustomers).toBe(1);
  });

  it("ranks prestations by revenue and shares add up", () => {
    const m = computeMetrics(
      [
        appointment({ status: "COMPLETED", serviceId: "a", serviceName: "Pose gel", totalAmount: 8000 }),
        appointment({ status: "COMPLETED", serviceId: "b", serviceName: "Dépose", totalAmount: 2000 }),
        appointment({ status: "COMPLETED", serviceId: "b", serviceName: "Dépose", totalAmount: 2000 }),
      ],
      opts,
    );
    expect(m.byService.map((s) => s.label)).toEqual(["Pose gel", "Dépose"]);
    expect(m.byService[1].count).toBe(2);
    expect(m.byService.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 5);
  });

  it("files a prestation with no category under a readable label", () => {
    const m = computeMetrics(
      [appointment({ status: "COMPLETED", categoryName: null })],
      opts,
    );
    expect(m.byCategory[0].label).toBe("Sans catégorie");
  });

  it("returns one point per day, including the empty ones", () => {
    const m = computeMetrics([appointment({ status: "COMPLETED" })], opts);
    expect(m.daily).toHaveLength(5);
    expect(m.daily.map((d) => d.date)).toEqual(DATES);
    expect(m.daily.find((d) => d.date === "2026-09-02")?.count).toBe(1);
    expect(m.daily.find((d) => d.date === "2026-09-03")?.count).toBe(0);
  });

  it("handles an empty period without dividing by zero", () => {
    const m = computeMetrics([], opts);
    expect(m.revenue).toBe(0);
    expect(m.cancellationRate).toBe(0);
    expect(m.noShowRate).toBe(0);
    expect(m.averageBasket).toBe(0);
    expect(m.daily).toHaveLength(5);
  });
});

describe("compare", () => {
  it("reports the absolute change and its direction", () => {
    expect(compare(120, 100)).toMatchObject({ change: 20, direction: "up" });
    expect(compare(80, 100)).toMatchObject({ change: -20, direction: "down" });
    expect(compare(100, 100)).toMatchObject({ change: 0, direction: "flat" });
  });

  it("gives the relative change when there is something to divide by", () => {
    expect(compare(150, 100).ratio).toBeCloseTo(0.5, 5);
    expect(compare(50, 100).ratio).toBeCloseTo(-0.5, 5);
  });

  it("refuses a percentage when the previous period was empty", () => {
    // "+100 %" from nothing would be a lie dressed as a number.
    expect(compare(3, 0).ratio).toBeNull();
    expect(compare(0, 0).ratio).toBeNull();
  });

  it("refuses a percentage on a base too small to carry one", () => {
    // Two absences becoming four is "+100 %", which reads like a collapse
    // instead of two extra absences.
    expect(compare(4, 2).ratio).toBeNull();
    expect(compare(4, 2).change).toBe(2);
    expect(compare(12, 9).ratio).toBeNull();
  });

  it("starts giving a percentage once the base can carry one", () => {
    expect(compare(11, 10).ratio).toBeCloseTo(0.1, 5);
  });

  it("carries the previous figure so it can be shown alongside", () => {
    expect(compare(4, 2).previous).toBe(2);
  });
});
