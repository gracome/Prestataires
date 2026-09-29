import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  readableActionColor,
  readableTextOn,
  themeStyle,
} from "@/lib/theme";

/**
 * A provider's palette has to reach every corner of her site.
 *
 * The stylesheet's defaults were named after colours rather than roles — a
 * rose, a cream, a chocolate — and anything the theme did not override stayed
 * the platform's own. That is how every site ended up wearing the same pink
 * button whatever its owner had chosen.
 */

function theme(overrides: Partial<Record<string, string>> = {}) {
  return {
    primaryColor: "#2E5AAC",
    secondaryColor: "#10151F",
    accentColor: "#C8A97E",
    backgroundColor: "#F5F7FA",
    surfaceColor: "#FFFFFF",
    textColor: "#10151F",
    mutedTextColor: "#5F6B7A",
    headingFont: "Inter",
    bodyFont: "Inter",
    buttonRadius: "medium",
    layoutVariant: "classic",
    ...overrides,
  };
}

const style = (t = theme()) => themeStyle(t) as unknown as Record<string, string>;

describe("themeStyle", () => {
  it("writes every brand colour from the provider's own palette", () => {
    const s = style();
    expect(s["--brand-primary"]).toBe("#2E5AAC");
    expect(s["--brand-secondary"]).toBe("#10151F");
    expect(s["--brand-accent"]).toBe("#C8A97E");
    expect(s["--brand-background"]).toBe("#F5F7FA");
  });

  it("leaves no platform colour behind in the legacy names", () => {
    const s = style();
    // These three used to hold the platform's cream, beige and plum whatever
    // the provider chose, which is what made every site look alike.
    expect(s["--brand-cream"]).toBe("#F5F7FA");
    expect(s["--brand-beige"]).toBe("#C8A97E");
    expect(s["--brand-chocolate"]).toBe("#10151F");
    expect(s["--brand-rose"]).toBe("#2E5AAC");
  });

  it("never emits the platform's own pink", () => {
    const s = style();
    const platformPink = ["#f27a9a", "#d6336c", "#fce8ee", "#fff5f7"];
    for (const value of Object.values(s)) {
      for (const pink of platformPink) {
        expect(String(value).toLowerCase()).not.toContain(pink);
      }
    }
  });

  it("derives the soft washes from her primary, over her own surface", () => {
    const s = style(theme({ primaryColor: "#2E5AAC", surfaceColor: "#FFFFFF" }));
    // A light wash of a blue primary must be a pale blue, never a pale pink.
    const pale = s["--brand-rose-pale"];
    expect(pale).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrastRatio(pale, "#FFFFFF")).toBeLessThan(1.4);
  });
});

describe("readableActionColor", () => {
  it("leaves a colour that already carries text alone", () => {
    expect(readableActionColor("#2E5AAC")).toBe("#2e5aac");
    expect(readableActionColor("#10151F")).toBe("#10151f");
  });

  it("deepens a pastel until its own label is readable", () => {
    // A provider is free to choose a pale pink; a pale pink button with white
    // text is not readable, and refusing her colour is not the answer either.
    const strong = readableActionColor("#F7C6D4");
    const best = Math.max(
      contrastRatio("#1c1917", strong),
      contrastRatio("#ffffff", strong),
    );
    expect(best).toBeGreaterThanOrEqual(4.5);
  });

  it("gives every button a readable label, whatever the palette", () => {
    const palettes = [
      "#F7C6D4", // pastel pink
      "#FFE9A8", // pale yellow
      "#B0797A", // the demo salon's rose
      "#2E5AAC", // deep blue
      "#10151F", // near black
      "#FFFFFF", // white
      "#7DD3FC", // light blue
      "#C8A97E", // sand
    ];

    for (const colour of palettes) {
      const strong = readableActionColor(colour);
      const label = readableTextOn(strong);
      expect(contrastRatio(label, strong)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("stays in the same family rather than swapping the colour out", () => {
    // Deepened, not replaced: a provider must still recognise her own choice.
    const strong = readableActionColor("#F7C6D4");
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(strong.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b);
    expect(r).toBeGreaterThan(g);
  });

  it("returns a malformed value untouched instead of throwing", () => {
    expect(readableActionColor("pas une couleur")).toBe("pas une couleur");
  });
});
