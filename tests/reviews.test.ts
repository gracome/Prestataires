import { describe, expect, it } from "vitest";
import { canLeaveReview, publicReviewerName, summarizeReviews } from "@/lib/reviews";

/**
 * Reviews are only as trustworthy as the rule deciding who may write one:
 * someone whose appointment has happened, once.
 */
describe("canLeaveReview", () => {
  const now = new Date("2026-10-09T18:00:00Z");
  const before = new Date("2026-10-09T15:00:00Z");
  const after = new Date("2026-10-09T20:00:00Z");

  it("opens once the appointment is completed", () => {
    expect(canLeaveReview({ status: "COMPLETED", serviceEndsAt: before, review: null }, now)).toBe(true);
  });

  it("opens for a confirmed appointment whose time is over, before the closing job runs", () => {
    expect(canLeaveReview({ status: "CONFIRMED", serviceEndsAt: before, review: null }, now)).toBe(true);
  });

  it("stays closed before the appointment ends", () => {
    expect(canLeaveReview({ status: "CONFIRMED", serviceEndsAt: after, review: null }, now)).toBe(false);
  });

  it("stays closed for an appointment that never happened", () => {
    for (const status of ["CANCELLED", "EXPIRED", "NO_SHOW", "AWAITING_PAYMENT"] as const) {
      expect(canLeaveReview({ status, serviceEndsAt: before, review: null }, now)).toBe(false);
    }
  });

  it("closes once a review exists", () => {
    expect(canLeaveReview({ status: "COMPLETED", serviceEndsAt: before, review: { id: "r1" } }, now)).toBe(false);
  });
});

describe("publicReviewerName", () => {
  it("keeps the first name and the initial of the last", () => {
    expect(publicReviewerName("Aïcha Koffi")).toBe("Aïcha K.");
    expect(publicReviewerName("  marie  claire  dossou ")).toBe("marie D.");
  });

  it("keeps a single name as it is, and never returns nothing", () => {
    expect(publicReviewerName("Fanny")).toBe("Fanny");
    expect(publicReviewerName("   ")).toBe("Cliente");
  });
});

describe("summarizeReviews", () => {
  it("averages to one decimal", () => {
    expect(summarizeReviews([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({ count: 3, average: 4.3 });
  });

  it("reports nothing rather than dividing by zero", () => {
    expect(summarizeReviews([])).toEqual({ count: 0, average: 0 });
  });
});
