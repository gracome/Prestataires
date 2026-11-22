import { describe, expect, it, vi } from "vitest";

// customer-view imports the database client; the rule under test never uses it.
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/booking/expiration", () => ({ releaseExpiredAppointments: vi.fn() }));

import {
  canCustomerReschedule,
  type CustomerBooking,
} from "@/lib/booking/customer-view";

const NOW = new Date("2026-11-10T10:00:00Z");

function booking(
  overrides: {
    status?: string;
    startsAt?: Date;
    allow?: boolean;
    noticeHours?: number;
  } = {},
): CustomerBooking {
  return {
    status: overrides.status ?? "CONFIRMED",
    startsAt: overrides.startsAt ?? new Date("2026-11-14T16:00:00Z"),
    provider: {
      bookingSettings: {
        allowCustomerCancellation: overrides.allow ?? true,
        cancellationNoticeHours: overrides.noticeHours ?? 24,
      },
    },
  } as unknown as CustomerBooking;
}

describe("canCustomerReschedule", () => {
  it("lets a confirmed appointment move well before it starts", () => {
    expect(canCustomerReschedule(booking(), NOW)).toBe(true);
  });

  it("refuses inside the provider's notice period", () => {
    const soon = new Date(NOW.getTime() + 20 * 3_600_000);
    expect(canCustomerReschedule(booking({ startsAt: soon }), NOW)).toBe(false);
  });

  it("follows a shorter notice period set by the provider", () => {
    const soon = new Date(NOW.getTime() + 20 * 3_600_000);
    expect(
      canCustomerReschedule(booking({ startsAt: soon, noticeHours: 12 }), NOW),
    ).toBe(true);
  });

  it("refuses when the provider does not allow online changes", () => {
    expect(canCustomerReschedule(booking({ allow: false }), NOW)).toBe(false);
  });

  it("refuses a booking still waiting for its deposit", () => {
    for (const status of ["AWAITING_PAYMENT", "PAYMENT_PROOF_SUBMITTED", "TEMPORARILY_RESERVED"]) {
      expect(canCustomerReschedule(booking({ status }), NOW)).toBe(false);
    }
  });

  it("refuses a booking that is over or cancelled", () => {
    for (const status of ["CANCELLED", "COMPLETED", "NO_SHOW", "EXPIRED"]) {
      expect(canCustomerReschedule(booking({ status }), NOW)).toBe(false);
    }
  });
});
