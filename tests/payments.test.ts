import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/payments/fedapay";

/**
 * The webhook signature is the only thing standing between "FedaPay says this
 * was paid" and "anyone on the internet says this was paid", so it is worth
 * more than a happy-path test.
 */

const SECRET = "wh_test_secret";

function sign(rawBody: string, at: Date, secret = SECRET): string {
  const t = Math.floor(at.getTime() / 1000);
  const s = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},s=${s}`;
}

describe("webhook signatures", () => {
  const now = new Date("2026-09-28T12:00:00Z");
  const body = JSON.stringify({ entity: { id: 4242, status: "approved" } });

  it("accepts a genuine callback", () => {
    expect(
      verifyWebhookSignature({
        header: sign(body, now),
        rawBody: body,
        secret: SECRET,
        now,
      }),
    ).toBe(true);
  });

  it("refuses a body that was altered after signing", () => {
    const tampered = JSON.stringify({ entity: { id: 9999, status: "approved" } });
    expect(
      verifyWebhookSignature({
        header: sign(body, now),
        rawBody: tampered,
        secret: SECRET,
        now,
      }),
    ).toBe(false);
  });

  it("refuses a signature made with another secret", () => {
    expect(
      verifyWebhookSignature({
        header: sign(body, now, "wh_someone_elses_secret"),
        rawBody: body,
        secret: SECRET,
        now,
      }),
    ).toBe(false);
  });

  it("refuses a callback replayed long afterwards", () => {
    // Captured once, sent again an hour later.
    const old = new Date(now.getTime() - 3_600_000);
    expect(
      verifyWebhookSignature({
        header: sign(body, old),
        rawBody: body,
        secret: SECRET,
        now,
      }),
    ).toBe(false);
  });

  it("tolerates a callback a couple of minutes late", () => {
    const slightlyLate = new Date(now.getTime() - 120_000);
    expect(
      verifyWebhookSignature({
        header: sign(body, slightlyLate),
        rawBody: body,
        secret: SECRET,
        now,
      }),
    ).toBe(true);
  });

  it("refuses a missing, empty or malformed header", () => {
    for (const header of [null, "", "nonsense", "t=,s=", "s=abc", "t=123"]) {
      expect(
        verifyWebhookSignature({ header, rawBody: body, secret: SECRET, now }),
      ).toBe(false);
    }
  });

  it("refuses a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on mismatched lengths, so the guard before it
    // matters as much as the comparison itself.
    expect(
      verifyWebhookSignature({
        header: `t=${Math.floor(now.getTime() / 1000)},s=deadbeef`,
        rawBody: body,
        secret: SECRET,
        now,
      }),
    ).toBe(false);
  });
});
