import { describe, expect, it } from "vitest";
import {
  ADMIN_PRESETS,
  DEFAULT_ADMIN_THEME,
  DEFAULT_THEME,
  adminColorsFromSite,
  adminThemeStyle,
  contrastRatio,
  isDarkBackground,
  readableTextOn,
  relativeLuminance,
} from "@/lib/theme";

/**
 * The provider chooses her own dashboard palette, so the only thing the code
 * must guarantee is that the status pills and the accent text stay readable
 * whatever she picks.
 */

const style = (theme = DEFAULT_ADMIN_THEME) =>
  adminThemeStyle(theme) as unknown as Record<string, string>;

describe("luminance and contrast", () => {
  it("places black and white at the extremes", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("gives the WCAG ratio for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#8A5D5E", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#8A5D5E"),
      5,
    );
  });

  it("falls back rather than throwing on a malformed colour", () => {
    expect(() => contrastRatio("nope", "#FFFFFF")).not.toThrow();
    expect(relativeLuminance("nope")).toBe(1);
  });

  it("recognises a dark background", () => {
    expect(isDarkBackground("#171514")).toBe(true);
    expect(isDarkBackground("#F6F5F4")).toBe(false);
  });
});

describe("text over the accent colour", () => {
  it("picks white on a deep accent and near-black on a pale one", () => {
    expect(readableTextOn("#8A5D5E")).toBe("#ffffff");
    expect(readableTextOn("#E8C7A8")).toBe("#1c1917");
  });

  it("always reaches a usable contrast against the accent", () => {
    for (const accent of ["#8A5D5E", "#E8C7A8", "#000000", "#FFFFFF", "#D89A9B"]) {
      const text = readableTextOn(accent);
      expect(contrastRatio(text, accent)).toBeGreaterThan(3);
    }
  });
});

describe("adminThemeStyle", () => {
  it("writes every variable the dashboard reads", () => {
    const vars = style();
    for (const name of [
      "--admin-bg",
      "--admin-surface",
      "--admin-text",
      "--admin-muted",
      "--admin-border",
      "--admin-accent",
      "--admin-accent-fg",
      "--admin-radius",
      "--admin-font",
      "--admin-subtle",
      "--brand-primary-fg",
    ]) {
      expect(vars[name], `${name} is missing`).toBeTruthy();
    }
  });

  it("writes all five status tones, each with three values", () => {
    const vars = style();
    for (const tone of ["success", "warning", "danger", "info", "neutral"]) {
      expect(vars[`--tone-${tone}-bg`]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(vars[`--tone-${tone}-fg`]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(vars[`--tone-${tone}-border`]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("swaps to the light-on-dark tone set for a dark dashboard", () => {
    const dark = style({
      ...DEFAULT_ADMIN_THEME,
      ...ADMIN_PRESETS.dark.colors!,
    });
    const light = style();

    expect(dark["--tone-success-bg"]).not.toBe(light["--tone-success-bg"]);
    // On a dark background the pill text must be the lighter of the pair.
    expect(
      relativeLuminance(dark["--tone-success-fg"]),
    ).toBeGreaterThan(relativeLuminance(dark["--tone-success-bg"]));
  });

  it("keeps every status pill readable in both sets", () => {
    for (const theme of [
      DEFAULT_ADMIN_THEME,
      { ...DEFAULT_ADMIN_THEME, ...ADMIN_PRESETS.dark.colors! },
      { ...DEFAULT_ADMIN_THEME, ...ADMIN_PRESETS.sand.colors! },
    ]) {
      const vars = style(theme);
      for (const tone of ["success", "warning", "danger", "info", "neutral"]) {
        const ratio = contrastRatio(
          vars[`--tone-${tone}-fg`],
          vars[`--tone-${tone}-bg`],
        );
        expect(ratio, `${tone} on ${theme.adminBackground}`).toBeGreaterThan(4.5);
      }
    }
  });

  it("falls back to the neutral palette when no theme is stored", () => {
    const vars = adminThemeStyle(null) as unknown as Record<string, string>;
    expect(vars["--admin-bg"]).toBe(DEFAULT_ADMIN_THEME.adminBackground);
  });
});

describe("presets", () => {
  it("gives every built-in preset a full set of colours", () => {
    for (const [name, preset] of Object.entries(ADMIN_PRESETS)) {
      if (name === "site" || name === "custom") {
        expect(preset.colors).toBeUndefined();
        continue;
      }
      expect(Object.keys(preset.colors!)).toHaveLength(6);
    }
  });

  it("keeps body text readable in every built-in preset", () => {
    for (const [name, preset] of Object.entries(ADMIN_PRESETS)) {
      if (!preset.colors) continue;
      const ratio = contrastRatio(preset.colors.adminText, preset.colors.adminSurface);
      expect(ratio, `${name} body text`).toBeGreaterThan(7);
    }
  });

  it("derives an opaque border when mirroring the public site", () => {
    const colors = adminColorsFromSite(DEFAULT_THEME);
    expect(colors.adminBorder).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.adminAccent).toBe(DEFAULT_THEME.primaryColor);
    expect(colors.adminBackground).toBe(DEFAULT_THEME.backgroundColor);
  });
});
