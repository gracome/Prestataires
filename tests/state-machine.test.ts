import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "@prisma/client";
import {
  BLOCKING_STATUSES,
  RELEASING_STATUSES,
  allowedTransitions,
  assertTransition,
  canExpire,
  canTransition,
  deadlineFor,
  initialStatus,
  isBlocking,
  isTerminal,
  providerActionsFor,
  resolveValidationMethod,
  statusLabelFr,
  statusTone,
  InvalidTransitionError,
} from "@/lib/booking/state-machine";

const DEADLINES = {
  holdDurationMinutes: 30,
  proofDeadlineMinutes: 30,
  verificationDeadlineMinutes: 120,
};

const ALL: AppointmentStatus[] = [
  "TEMPORARILY_RESERVED",
  "AWAITING_PAYMENT",
  "PAYMENT_PROOF_SUBMITTED",
  "CONFIRMED",
  "PAYMENT_REJECTED",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "NO_SHOW",
];

describe("blocking and releasing statuses", () => {
  it("never lets a status both hold and release a slot", () => {
    for (const status of BLOCKING_STATUSES) {
      expect(RELEASING_STATUSES).not.toContain(status);
    }
  });

  it("classifies every status exactly once", () => {
    for (const status of ALL) {
      const blocking = BLOCKING_STATUSES.includes(status);
      const releasing = RELEASING_STATUSES.includes(status);
      expect(blocking || releasing).toBe(true);
      expect(blocking && releasing).toBe(false);
    }
  });

  it("frees the slot on every failure path in the specification", () => {
    // Sections 12, 30 and 31: rejected, cancelled and expired all release.
    expect(isBlocking("PAYMENT_REJECTED")).toBe(false);
    expect(isBlocking("CANCELLED")).toBe(false);
    expect(isBlocking("EXPIRED")).toBe(false);
  });

  it("keeps the slot for anything still live", () => {
    expect(isBlocking("TEMPORARILY_RESERVED")).toBe(true);
    expect(isBlocking("AWAITING_PAYMENT")).toBe(true);
    expect(isBlocking("PAYMENT_PROOF_SUBMITTED")).toBe(true);
    expect(isBlocking("CONFIRMED")).toBe(true);
  });
});

describe("transitions", () => {
  it("follows the main flow from the specification", () => {
    expect(canTransition("TEMPORARILY_RESERVED", "AWAITING_PAYMENT")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "PAYMENT_PROOF_SUBMITTED")).toBe(true);
    expect(canTransition("PAYMENT_PROOF_SUBMITTED", "CONFIRMED")).toBe(true);
  });

  it("allows the refusal and expiry branches", () => {
    expect(canTransition("PAYMENT_PROOF_SUBMITTED", "PAYMENT_REJECTED")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "EXPIRED")).toBe(true);
    expect(canTransition("TEMPORARILY_RESERVED", "EXPIRED")).toBe(true);
  });

  it("confirms a no-deposit booking without a payment step", () => {
    expect(canTransition("TEMPORARILY_RESERVED", "CONFIRMED")).toBe(true);
  });

  it("refuses to skip backwards or reopen a settled booking", () => {
    expect(canTransition("CONFIRMED", "AWAITING_PAYMENT")).toBe(false);
    expect(canTransition("EXPIRED", "CONFIRMED")).toBe(false);
    expect(canTransition("PAYMENT_REJECTED", "CONFIRMED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
  });

  it("leaves every terminal status with nowhere to go", () => {
    for (const status of ALL) {
      if (isTerminal(status)) expect(allowedTransitions(status)).toEqual([]);
    }
  });

  it("throws a typed error on an illegal transition", () => {
    expect(() => assertTransition("EXPIRED", "CONFIRMED")).toThrow(
      InvalidTransitionError,
    );
    expect(() => assertTransition("AWAITING_PAYMENT", "PAYMENT_PROOF_SUBMITTED")).not.toThrow();
  });

  it("never allows a transition into a status that is already terminal from itself", () => {
    for (const status of ALL) {
      expect(allowedTransitions(status)).not.toContain(status);
    }
  });
});

describe("deadlines", () => {
  const now = new Date("2025-06-03T09:00:00.000Z");
  const startsAt = new Date("2025-06-05T14:00:00.000Z");

  it("gives a hold the configured blocking duration", () => {
    expect(deadlineFor("TEMPORARILY_RESERVED", now, DEADLINES, startsAt)).toEqual(
      new Date("2025-06-03T09:30:00.000Z"),
    );
  });

  it("gives the proof upload its own window", () => {
    expect(deadlineFor("AWAITING_PAYMENT", now, DEADLINES, startsAt)).toEqual(
      new Date("2025-06-03T09:30:00.000Z"),
    );
  });

  it("gives the provider the verification window", () => {
    expect(deadlineFor("PAYMENT_PROOF_SUBMITTED", now, DEADLINES, startsAt)).toEqual(
      new Date("2025-06-03T11:00:00.000Z"),
    );
  });

  it("never lets a deadline run past the appointment itself", () => {
    const soon = new Date("2025-06-03T09:10:00.000Z");
    expect(deadlineFor("TEMPORARILY_RESERVED", now, DEADLINES, soon)).toEqual(soon);
  });

  it("gives a confirmed booking no deadline", () => {
    expect(deadlineFor("CONFIRMED", now, DEADLINES, startsAt)).toBeNull();
    expect(deadlineFor("CANCELLED", now, DEADLINES, startsAt)).toBeNull();
  });

  it("marks exactly the pending statuses as expirable", () => {
    expect(canExpire("TEMPORARILY_RESERVED")).toBe(true);
    expect(canExpire("AWAITING_PAYMENT")).toBe(true);
    expect(canExpire("PAYMENT_PROOF_SUBMITTED")).toBe(true);
    expect(canExpire("CONFIRMED")).toBe(false);
    expect(canExpire("COMPLETED")).toBe(false);
  });
});

describe("validation method", () => {
  it("skips the payment flow when no deposit is due", () => {
    expect(resolveValidationMethod(0)).toBe("NO_DEPOSIT");
    expect(initialStatus("NO_DEPOSIT")).toBe("CONFIRMED");
  });

  it("uses the manual flow by default when a deposit is due", () => {
    expect(resolveValidationMethod(3000)).toBe("MANUAL_PAYMENT");
    expect(initialStatus("MANUAL_PAYMENT")).toBe("TEMPORARILY_RESERVED");
  });

  it("switches to the online flow when an aggregator is enabled", () => {
    // Section 28: adding a payment provider must not change the state machine.
    expect(resolveValidationMethod(3000, true)).toBe("ONLINE_PAYMENT");
    expect(initialStatus("ONLINE_PAYMENT")).toBe("TEMPORARILY_RESERVED");
  });
});

describe("actions offered to the provider", () => {
  /** Which transition each dashboard button ultimately performs. */
  const TARGET: Record<string, AppointmentStatus[]> = {
    VERIFY_PAYMENT: ["CONFIRMED", "PAYMENT_REJECTED"],
    CONFIRM_WITHOUT_DEPOSIT: ["CONFIRMED"],
    COMPLETE: ["COMPLETED"],
    NO_SHOW: ["NO_SHOW"],
    CANCEL: ["CANCELLED"],
  };

  it("never offers an action the state machine would refuse", () => {
    for (const status of ALL) {
      for (const hasPendingProof of [true, false]) {
        for (const action of providerActionsFor(status, { hasPendingProof })) {
          for (const target of TARGET[action]) {
            expect(
              canTransition(status, target),
              `${status} offers ${action} but cannot reach ${target}`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("lets the provider confirm a booking still waiting for its deposit", () => {
    // The customer paid in cash, or the provider waives the deposit. This was
    // offered by the dashboard while the machine refused it, so the button
    // did nothing at all.
    expect(canTransition("AWAITING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(
      providerActionsFor("AWAITING_PAYMENT", { hasPendingProof: false }),
    ).toContain("CONFIRM_WITHOUT_DEPOSIT");
  });

  it("offers the verification pair only when a proof is waiting", () => {
    expect(
      providerActionsFor("PAYMENT_PROOF_SUBMITTED", { hasPendingProof: true }),
    ).toContain("VERIFY_PAYMENT");
    expect(
      providerActionsFor("PAYMENT_PROOF_SUBMITTED", { hasPendingProof: false }),
    ).not.toContain("VERIFY_PAYMENT");
  });

  it("offers nothing on a settled booking", () => {
    for (const status of ["EXPIRED", "CANCELLED", "PAYMENT_REJECTED"] as const) {
      expect(providerActionsFor(status, { hasPendingProof: false })).toEqual([]);
    }
  });

  it("offers closing actions only once the booking is confirmed", () => {
    const actions = providerActionsFor("CONFIRMED", { hasPendingProof: false });
    expect(actions).toContain("COMPLETE");
    expect(actions).toContain("NO_SHOW");
    expect(actions).toContain("CANCEL");
  });
});

describe("presentation", () => {
  it("has a French label and a tone for every status", () => {
    for (const status of ALL) {
      expect(statusLabelFr(status)).toBeTruthy();
      expect(statusTone(status)).toBeTruthy();
    }
  });
});
