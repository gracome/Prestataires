import { describe, expect, it } from "vitest";
import { renewalNoticeEmail } from "@/lib/plans/subscription";

/**
 * The letter a week before a period ends. At the end of a trial she is
 * choosing a package, so every package and its price has to be in it.
 */
describe("renewalNoticeEmail", () => {
  const base = {
    businessName: "Fanny Beauty & Hair",
    ownerName: "Fanny",
    currency: "XOF",
    plan: "BUSINESS" as const,
    endsAt: new Date("2026-11-21T23:00:00Z"),
  };

  it("speaks of the trial when no payment was ever recorded", () => {
    const letter = renewalNoticeEmail({ ...base, trial: true });
    expect(letter.subject).toContain("essai gratuit");
    expect(letter.text).toContain("21 novembre 2026");
    expect(letter.text).toContain("(votre essai)");
  });

  it("speaks of the subscription once she has paid", () => {
    const letter = renewalNoticeEmail({ ...base, trial: false });
    expect(letter.subject).toContain("abonnement");
    expect(letter.text).toContain("(votre offre)");
  });

  it("lists every package with its monthly price, and links to the comparison", () => {
    const letter = renewalNoticeEmail({ ...base, trial: true });
    for (const name of ["Essentiel", "Rendez-vous", "Business"]) expect(letter.text).toContain(name);
    expect(letter.text).toMatch(/5\s?000/);
    expect(letter.text).toMatch(/8\s?000/);
    expect(letter.text).toMatch(/12\s?000/);
    expect(letter.html).toContain("/#tarifs");
  });

  it("never uses a long dash", () => {
    const letter = renewalNoticeEmail({ ...base, trial: true });
    expect(`${letter.subject}${letter.text}`).not.toMatch(/[—–]/);
  });
});
