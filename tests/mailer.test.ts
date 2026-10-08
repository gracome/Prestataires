import { describe, expect, it } from "vitest";
import { senderFor } from "@/lib/email/mailer";

/**
 * The sender a customer sees.
 *
 * A booking confirmation comes from the business she booked with, at the
 * platform's own address. The name is whatever the provider typed, so it has
 * to come out as one valid, quoted header value whatever it contains.
 */
describe("senderFor", () => {
  const from = "Prestataire <notifications@example.com>";

  it("keeps MAIL_FROM as it is when no name is given", () => {
    expect(senderFor(from)).toBe(from);
    expect(senderFor(from, "   ")).toBe(from);
  });

  it("puts the provider's name on the platform's address", () => {
    expect(senderFor(from, "Fanny Beauty & Hair")).toBe(
      '"Fanny Beauty & Hair" <notifications@example.com>',
    );
  });

  it("works with a bare address in MAIL_FROM", () => {
    expect(senderFor("notifications@example.com", "Studio L.N.")).toBe(
      '"Studio L.N." <notifications@example.com>',
    );
  });

  it("escapes quotes and cannot be made to start another header", () => {
    const sender = senderFor(from, 'Salon "Chic"\r\nBcc: victim@example.com');
    expect(sender).not.toMatch(/[\r\n]/);
    expect(sender).toBe('"Salon \\"Chic\\" Bcc: victim@example.com" <notifications@example.com>');
  });
});
