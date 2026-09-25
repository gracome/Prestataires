import { describe, expect, it } from "vitest";
import { generatePassword, slugify } from "@/lib/platform/providers";

/**
 * The pure half of platform administration.
 *
 * A slug becomes a provider's public address and cannot be changed casually
 * afterwards, and a generated password is read aloud down a telephone line.
 * Both are worth pinning down.
 */

describe("slugify", () => {
  it("lowercases and joins words with a dash", () => {
    expect(slugify("Belle Mains Studio")).toBe("belle-mains-studio");
  });

  it("strips accents rather than dropping the letters", () => {
    expect(slugify("Beauté Créole")).toBe("beaute-creole");
    expect(slugify("Ongles d'Aïcha")).toBe("ongles-d-aicha");
  });

  it("collapses punctuation and spacing into single dashes", () => {
    expect(slugify("Nails   &&&   Co.")).toBe("nails-co");
  });

  it("leaves no dash hanging at either end", () => {
    expect(slugify("  --Studio Lina--  ")).toBe("studio-lina");
    expect(slugify("!!!")).toBe("");
  });

  it("caps the length so a URL stays usable", () => {
    const slug = slugify("a".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(60);
  });

  it("keeps digits, which salons do use in their names", () => {
    expect(slugify("Studio 229")).toBe("studio-229");
  });
});

describe("generatePassword", () => {
  it("comes out in four readable groups", () => {
    expect(generatePassword()).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
  });

  it("leaves out the characters people confuse when reading aloud", () => {
    // O against 0, I and L against 1, S against 5, B against 8, Z against 2.
    const forbidden = /[OIL1S5B8Z0]/;
    for (let i = 0; i < 200; i += 1) {
      expect(generatePassword()).not.toMatch(forbidden);
    }
  });

  it("does not repeat itself", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generatePassword()));
    expect(seen.size).toBe(200);
  });
});
