import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  asLayoutVariant,
  isNaturalOrder,
  resolveSectionOrder,
} from "@/lib/site/sections";

/**
 * The order a provider gives her own page.
 *
 * One invariant carries the feature: whatever is stored, every section comes
 * back exactly once. Reordering must never be able to make a section vanish,
 * and adding a new one to the platform must never require rewriting a single
 * saved order.
 */

const ALL = SECTIONS.map((section) => section.key);

describe("resolveSectionOrder", () => {
  it("falls back to the platform order when she never chose one", () => {
    expect(resolveSectionOrder([])).toEqual(ALL);
    expect(resolveSectionOrder(null)).toEqual(ALL);
    expect(resolveSectionOrder(undefined)).toEqual(ALL);
  });

  it("honours the order she saved", () => {
    const chosen = ["gallery", "about", "services"];
    expect(resolveSectionOrder(chosen).slice(0, 3)).toEqual(chosen);
  });

  it("returns every section exactly once, whatever was stored", () => {
    const inputs = [
      [],
      ["gallery"],
      ["contact", "faq", "hours"],
      ["services", "services", "services"],
      ["inconnue", "gallery", "autre-chose"],
      [...ALL].reverse(),
    ];

    for (const input of inputs) {
      const resolved = resolveSectionOrder(input);
      expect(new Set(resolved).size).toBe(ALL.length);
      expect([...resolved].sort()).toEqual([...ALL].sort());
    }
  });

  it("appends a section she never placed rather than dropping it", () => {
    // This is what happens the day the platform adds a new section: her saved
    // order predates it and must keep working.
    const resolved = resolveSectionOrder(["contact"]);
    expect(resolved[0]).toBe("contact");
    expect(resolved).toContain("services");
    expect(resolved).toHaveLength(ALL.length);
  });

  it("ignores a key the code no longer knows", () => {
    // The reverse case: a section was removed from the platform, her order
    // still names it.
    expect(resolveSectionOrder(["disparue", "gallery"])[0]).toBe("gallery");
  });

  it("keeps only the first appearance of a repeated key", () => {
    const resolved = resolveSectionOrder(["faq", "services", "faq"]);
    expect(resolved.filter((key) => key === "faq")).toHaveLength(1);
    expect(resolved[0]).toBe("faq");
  });
});

describe("isNaturalOrder", () => {
  it("recognises an untouched page", () => {
    expect(isNaturalOrder([])).toBe(true);
    expect(isNaturalOrder(ALL)).toBe(true);
  });

  it("recognises a page she rearranged", () => {
    expect(isNaturalOrder(["gallery", "services"])).toBe(false);
  });
});

describe("asLayoutVariant", () => {
  it("accepts the three layouts", () => {
    expect(asLayoutVariant("classic")).toBe("classic");
    expect(asLayoutVariant("editorial")).toBe("editorial");
    expect(asLayoutVariant("minimal")).toBe("minimal");
  });

  it("falls back rather than rendering nothing", () => {
    expect(asLayoutVariant("n-importe-quoi")).toBe("classic");
    expect(asLayoutVariant(null)).toBe("classic");
    expect(asLayoutVariant(undefined)).toBe("classic");
  });
});
