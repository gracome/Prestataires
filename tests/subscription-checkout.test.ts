import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Settling an online subscription payment.
 *
 * Money is at stake twice over: a payment recorded twice gives away a free
 * month, and one recorded on a declined or short transaction gives away a
 * paid one. The database and FedaPay are replaced by small fakes so the rule
 * itself is what is tested.
 */

const state = vi.hoisted(() => ({
  checkout: null as null | Record<string, unknown>,
  fedapay: { status: "approved", amount: 12000 as number | null },
  recorded: 0,
}));

vi.mock("@/lib/db", () => {
  const subscriptionCheckout = {
    findFirst: vi.fn(async () => (state.checkout ? { ...state.checkout } : null)),
    updateMany: vi.fn(async ({ where, data }: { where: { status: string }; data: Record<string, unknown> }) => {
      if (!state.checkout || state.checkout.status !== where.status) return { count: 0 };
      Object.assign(state.checkout, data);
      return { count: 1 };
    }),
  };
  const prisma = {
    subscriptionCheckout,
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ subscriptionCheckout })),
  };
  return { prisma };
});

vi.mock("@/lib/payments/fedapay", () => ({
  createCheckout: vi.fn(),
  fetchTransactionStatus: vi.fn(async () => ({ ...state.fedapay })),
}));

vi.mock("@/lib/plans/subscription", () => ({
  recordSubscriptionPayment: vi.fn(async () => {
    state.recorded += 1;
    return { periodEndsAt: new Date(), amount: 12000 };
  }),
}));

process.env.PLATFORM_FEDAPAY_SECRET_KEY = "sk_sandbox_test";

import { settleSubscriptionCheckout } from "@/lib/plans/checkout";

beforeEach(() => {
  state.checkout = {
    id: "co_1",
    providerId: "p_1",
    plan: "BUSINESS",
    billingPeriod: "MONTHLY",
    extraModules: [],
    amount: 12000,
    gatewayTransactionId: "tx_1",
    status: "PENDING",
  };
  state.fedapay = { status: "approved", amount: 12000 };
  state.recorded = 0;
});

describe("settleSubscriptionCheckout", () => {
  it("records an approved payment once, however many times it is settled", async () => {
    expect(await settleSubscriptionCheckout({ id: "co_1" })).toBe("paid");
    expect(await settleSubscriptionCheckout({ id: "co_1" })).toBe("already-paid");
    expect(await settleSubscriptionCheckout({ gatewayTransactionId: "tx_1" })).toBe("already-paid");
    expect(state.recorded).toBe(1);
  });

  it("records nothing for a declined payment, and marks it failed", async () => {
    state.fedapay = { status: "declined", amount: 12000 };
    expect(await settleSubscriptionCheckout({ id: "co_1" })).toBe("failed");
    expect(state.checkout?.status).toBe("FAILED");
    expect(state.recorded).toBe(0);
  });

  it("waits while the operator has not confirmed", async () => {
    state.fedapay = { status: "pending", amount: null };
    expect(await settleSubscriptionCheckout({ id: "co_1" })).toBe("pending");
    expect(state.checkout?.status).toBe("PENDING");
    expect(state.recorded).toBe(0);
  });

  it("refuses a transaction for less than the price asked", async () => {
    state.fedapay = { status: "approved", amount: 5000 };
    expect(await settleSubscriptionCheckout({ id: "co_1" })).toBe("failed");
    expect(state.recorded).toBe(0);
  });
});
