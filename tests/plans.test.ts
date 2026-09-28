import { describe, expect, it } from "vitest";
import { canOpenSection, featuresOf, hasFeature } from "@/lib/auth/features";
import {
  MONTHS_CHARGED_YEARLY,
  PLANS,
  planHighlights,
  priceFor,
  sellableFeatures,
  yearlyPrice,
} from "@/lib/plans/catalogue";
import { addMonths } from "@/lib/plans/subscription";

describe("entitlements", () => {
  it("grants nothing beyond the showcase site on the entry package", () => {
    const provider = { plan: "ESSENTIEL" as const, extraModules: [] };
    expect(featuresOf(provider).size).toBe(0);
    expect(hasFeature(provider, "BOOKING")).toBe(false);
    expect(hasFeature(provider, "TILL")).toBe(false);
  });

  it("grants online booking and the calendar sync on the middle package", () => {
    const provider = { plan: "RENDEZ_VOUS" as const, extraModules: [] };
    expect(hasFeature(provider, "BOOKING")).toBe(true);
    expect(hasFeature(provider, "GOOGLE_CALENDAR")).toBe(true);
    // Sold separately, or with the top package.
    expect(hasFeature(provider, "DEPOSITS")).toBe(false);
    expect(hasFeature(provider, "REPORTS")).toBe(false);
  });

  it("adds modules bought on top of a package", () => {
    const provider = {
      plan: "ESSENTIEL" as const,
      extraModules: ["TILL" as const],
    };
    expect(hasFeature(provider, "TILL")).toBe(true);
    expect(hasFeature(provider, "BOOKING")).toBe(false);
  });

  it("is unbothered by a module the package already grants", () => {
    const provider = {
      plan: "BUSINESS" as const,
      extraModules: ["BOOKING" as const],
    };
    expect(featuresOf(provider).has("BOOKING")).toBe(true);
    expect([...featuresOf(provider)].filter((f) => f === "BOOKING")).toHaveLength(1);
  });
});

describe("opening a section", () => {
  const essentiel = featuresOf({ plan: "ESSENTIEL", extraModules: [] });
  const business = featuresOf({ plan: "BUSINESS", extraModules: [] });

  it("lets the owner into what the subscription covers", () => {
    expect(canOpenSection("PROVIDER", "till", business)).toBe(true);
    expect(canOpenSection("PROVIDER", "bookings", business)).toBe(true);
  });

  it("keeps the owner out of what was not paid for", () => {
    expect(canOpenSection("PROVIDER", "till", essentiel)).toBe(false);
    expect(canOpenSection("PROVIDER", "bookings", essentiel)).toBe(false);
    expect(canOpenSection("PROVIDER", "payment", essentiel)).toBe(false);
  });

  it("leaves the showcase screens open on every package", () => {
    for (const section of ["services", "hours", "gallery", "site", "settings"] as const) {
      expect(canOpenSection("PROVIDER", section, essentiel)).toBe(true);
    }
  });

  it("still applies the role on top of the subscription", () => {
    // The reports are the owner's business even on the fullest package.
    expect(canOpenSection("STAFF", "reports", business)).toBe(false);
    expect(canOpenSection("PROVIDER", "reports", business)).toBe(true);
    // And a paid module an employee may use stays open to her.
    expect(canOpenSection("STAFF", "till", business)).toBe(true);
  });

  it("closes the calendar without online booking, rather than showing an empty grid", () => {
    expect(canOpenSection("PROVIDER", "calendar", essentiel)).toBe(false);
    expect(canOpenSection("PROVIDER", "calendar", business)).toBe(true);
  });
});

describe("pricing", () => {
  it("charges ten months for a year", () => {
    expect(yearlyPrice(5000)).toBe(50000);
    expect(MONTHS_CHARGED_YEARLY).toBe(10);
  });

  it("prices a package with no extras at its own rate", () => {
    expect(priceFor("ESSENTIEL", "MONTHLY")).toBe(PLANS.ESSENTIEL.monthly);
    expect(priceFor("ESSENTIEL", "YEARLY")).toBe(yearlyPrice(PLANS.ESSENTIEL.monthly));
  });

  it("adds a module that the package does not already include", () => {
    const withTill = priceFor("ESSENTIEL", "MONTHLY", ["TILL"]);
    expect(withTill).toBeGreaterThan(PLANS.ESSENTIEL.monthly);
  });

  it("never charges twice for a module the package already grants", () => {
    expect(priceFor("BUSINESS", "MONTHLY", ["TILL", "BOOKING"])).toBe(
      PLANS.BUSINESS.monthly,
    );
  });

  it("keeps every package strictly cheaper than the same features à la carte", () => {
    // A package that costs as much as its parts gives nobody a reason to take
    // it, which is the mistake this guards against.
    for (const plan of ["RENDEZ_VOUS", "BUSINESS"] as const) {
      // The entry package plus every module this one grants, bought one by one.
      const alaCarte = priceFor("ESSENTIEL", "MONTHLY", [...PLANS[plan].grants]);
      expect(PLANS[plan].monthly).toBeLessThan(alaCarte);
    }
  });

  it("only offers modules that are finished", () => {
    // The custom domain routes but cannot be set from any screen yet.
    expect(sellableFeatures()).not.toContain("CUSTOM_DOMAIN");
  });
});

describe("package cards", () => {
  it("does not repeat what the package below already granted", () => {
    const highlights = planHighlights("BUSINESS");
    expect(highlights).not.toContain("Réservation en ligne");
    expect(highlights).toContain("Caisse");
  });
});

describe("subscription periods", () => {
  it("advances by whole months", () => {
    expect(addMonths(new Date("2026-01-15T00:00:00Z"), 1).toISOString()).toContain(
      "2026-02-15",
    );
    expect(addMonths(new Date("2026-01-15T00:00:00Z"), 12).toISOString()).toContain(
      "2027-01-15",
    );
  });

  it("clamps to the last day rather than spilling into the next month", () => {
    // 31 January plus one month must be 28 February, not 3 March: spilling
    // would gift two or three days at every renewal.
    const end = addMonths(new Date("2026-01-31T00:00:00Z"), 1);
    expect(end.getUTCMonth()).toBe(1);
    expect(end.getUTCDate()).toBe(28);
  });

  it("handles a leap year", () => {
    const end = addMonths(new Date("2028-01-31T00:00:00Z"), 1);
    expect(end.getUTCMonth()).toBe(1);
    expect(end.getUTCDate()).toBe(29);
  });
});
