import type { CSSProperties } from "react";
import type { Theme } from "@prisma/client";

/**
 * Per-provider theming (cahier des charges section 20).
 *
 * The palette is applied as inline custom properties on the page wrapper, so
 * the same components render in any provider's colours with no code change
 * and no build step per client.
 */

const RADIUS: Record<string, string> = {
  none: "0px",
  small: "8px",
  medium: "14px",
  full: "999px",
};

const FONT_STACKS: Record<string, string> = {
  "Playfair Display": '"Playfair Display", Georgia, serif',
  Cormorant: '"Cormorant Garamond", Georgia, serif',
  Fraunces: '"Fraunces", Georgia, serif',
  Marcellus: '"Marcellus", Georgia, serif',
  Inter: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  Poppins: 'Poppins, -apple-system, "Segoe UI", sans-serif',
  Lato: 'Lato, -apple-system, "Segoe UI", sans-serif',
  "DM Sans": '"DM Sans", -apple-system, "Segoe UI", sans-serif',
};

export const HEADING_FONTS = [
  "Playfair Display",
  "Cormorant",
  "Fraunces",
  "Marcellus",
  "Inter",
  "DM Sans",
] as const;

export const BODY_FONTS = ["Inter", "DM Sans", "Poppins", "Lato"] as const;

export const BUTTON_RADII = [
  { value: "full", label: "Arrondi complet" },
  { value: "medium", label: "Arrondi moyen" },
  { value: "small", label: "Légèrement arrondi" },
  { value: "none", label: "Angles droits" },
] as const;

export const LAYOUT_VARIANTS = [
  { value: "classic", label: "Classique" },
  { value: "editorial", label: "Éditorial" },
  { value: "minimal", label: "Minimal" },
] as const;

function fontStack(name: string, fallback: string): string {
  return FONT_STACKS[name] ?? `"${name}", ${fallback}`;
}

export type ThemeLike = Pick<
  Theme,
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "backgroundColor"
  | "surfaceColor"
  | "textColor"
  | "mutedTextColor"
  | "headingFont"
  | "bodyFont"
  | "buttonRadius"
  | "layoutVariant"
>;

export const DEFAULT_THEME: ThemeLike = {
  primaryColor: "#B0797A",
  secondaryColor: "#2F2A2B",
  accentColor: "#E8C7A8",
  backgroundColor: "#FBF8F6",
  surfaceColor: "#FFFFFF",
  textColor: "#2B2422",
  mutedTextColor: "#6B5F5A",
  headingFont: "Playfair Display",
  bodyFont: "Inter",
  buttonRadius: "full",
  layoutVariant: "classic",
};

/** Inline style object carrying the provider palette. */
export function themeStyle(theme: ThemeLike | null | undefined): CSSProperties {
  const t = theme ?? DEFAULT_THEME;

  return {
    "--brand-primary": t.primaryColor,
    "--brand-secondary": t.secondaryColor,
    "--brand-accent": t.accentColor,
    "--brand-background": t.backgroundColor,
    "--brand-surface": t.surfaceColor,
    "--brand-text": t.textColor,
    "--brand-muted": t.mutedTextColor,
    "--brand-border": hexToRgba(t.textColor, 0.12),
    "--brand-radius": RADIUS[t.buttonRadius] ?? RADIUS.full,
    "--font-heading": fontStack(t.headingFont, "Georgia, serif"),
    "--font-body": fontStack(t.bodyFont, "system-ui, sans-serif"),
    backgroundColor: t.backgroundColor,
    color: t.textColor,
  } as CSSProperties;
}

/** Google Fonts href for the two chosen families, or null for system fonts. */
export function googleFontsHref(theme: ThemeLike | null | undefined): string | null {
  const t = theme ?? DEFAULT_THEME;
  const families = Array.from(new Set([t.headingFont, t.bodyFont])).filter(
    (name) => name in FONT_STACKS && !name.startsWith("system"),
  );

  if (families.length === 0) return null;

  const query = families
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

// ---------------------------------------------------------------------------
// Dashboard palette
// ---------------------------------------------------------------------------

export type AdminThemeLike = Pick<
  Theme,
  | "adminPreset"
  | "adminBackground"
  | "adminSurface"
  | "adminText"
  | "adminMuted"
  | "adminBorder"
  | "adminAccent"
  | "adminFont"
  | "adminRadius"
>;

export const DEFAULT_ADMIN_THEME: AdminThemeLike = {
  adminPreset: "neutral",
  adminBackground: "#F6F5F4",
  adminSurface: "#FFFFFF",
  adminText: "#23201F",
  adminMuted: "#6F6763",
  adminBorder: "#E6E1DE",
  adminAccent: "#8A5D5E",
  adminFont: "Inter",
  adminRadius: "medium",
};

/**
 * Ready-made dashboard palettes.
 *
 * Most providers are not designers and should not have to pick six colours
 * that work together. "site" is filled from the public theme at save time.
 */
export const ADMIN_PRESETS: Record<
  string,
  { label: string; description: string; colors?: Omit<AdminThemeLike, "adminPreset" | "adminFont" | "adminRadius"> }
> = {
  neutral: {
    label: "Neutre",
    description: "Gris très clair et blanc. Reposant sur une longue journée.",
    colors: {
      adminBackground: "#F6F5F4",
      adminSurface: "#FFFFFF",
      adminText: "#23201F",
      adminMuted: "#6F6763",
      adminBorder: "#E6E1DE",
      adminAccent: "#8A5D5E",
    },
  },
  dark: {
    label: "Sombre",
    description: "Fond profond, texte clair. Confortable le soir.",
    colors: {
      adminBackground: "#171514",
      adminSurface: "#211E1D",
      adminText: "#F2EEEC",
      adminMuted: "#A79E99",
      adminBorder: "#332F2D",
      adminAccent: "#D89A9B",
    },
  },
  sand: {
    label: "Sable",
    description: "Beige chaud, dans l'esprit d'un institut.",
    colors: {
      adminBackground: "#F7F2EC",
      adminSurface: "#FFFDFB",
      adminText: "#2C2520",
      adminMuted: "#7A6C60",
      adminBorder: "#E7DCCF",
      adminAccent: "#A8714F",
    },
  },
  site: {
    label: "Comme mon site",
    description: "Reprend les couleurs de votre site public.",
  },
  custom: {
    label: "Personnalisé",
    description: "Vous choisissez chaque couleur.",
  },
};

/** The dashboard palette implied by the public theme, for the "site" preset. */
export function adminColorsFromSite(
  theme: ThemeLike,
): Omit<AdminThemeLike, "adminPreset" | "adminFont" | "adminRadius"> {
  return {
    adminBackground: theme.backgroundColor,
    adminSurface: theme.surfaceColor,
    adminText: theme.textColor,
    adminMuted: theme.mutedTextColor,
    adminBorder: hexToHex(theme.textColor, theme.surfaceColor, 0.14),
    adminAccent: theme.primaryColor,
  };
}

/** WCAG relative luminance, 0 for black and 1 for white. */
export function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 1;

  const value = Number.parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    },
  );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function isDarkBackground(hex: string): boolean {
  return relativeLuminance(hex) < 0.4;
}

/**
 * Contrast ratio between two colours, as WCAG defines it. Used to warn the
 * provider when a combination would be hard to read rather than to forbid it:
 * it is her workspace, she decides.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Status tones, in a light and a dark version.
 *
 * The pills are the only thing on the dashboard that must stay readable
 * whatever palette is chosen: they are how a provider spots a proof waiting
 * for her. So they are not derived from her colours, they are swapped for the
 * set that matches the brightness of her background.
 */
type ToneName = "success" | "warning" | "danger" | "info" | "neutral";

/** Background, foreground and border for one status tone. */
type ToneTriplet = readonly [string, string, string];

const TONES: Record<"light" | "dark", Record<ToneName, ToneTriplet>> = {
  light: {
    success: ["#E2F2E6", "#1F6B38", "#C5E3CF"],
    warning: ["#FDF3E2", "#7D5410", "#F0DCB8"],
    danger: ["#FBE4E2", "#8F241C", "#F1C4C0"],
    info: ["#EEF2F8", "#294B74", "#D3DFEF"],
    neutral: ["#EEEAE8", "#5C5350", "#E0DAD7"],
  },
  dark: {
    success: ["#1B3326", "#7FDCA1", "#2C4B38"],
    warning: ["#382C15", "#F0C478", "#4D3D20"],
    danger: ["#3A1E1B", "#F2A79E", "#4E2B27"],
    info: ["#1B2A3A", "#96C3EE", "#2A3E52"],
    neutral: ["#2A2725", "#ADA49F", "#3A3634"],
  },
};

const ADMIN_RADIUS: Record<string, string> = {
  none: "0px",
  small: "8px",
  medium: "12px",
  large: "18px",
};

export const ADMIN_RADII = [
  { value: "none", label: "Angles droits" },
  { value: "small", label: "Légèrement arrondi" },
  { value: "medium", label: "Arrondi moyen" },
  { value: "large", label: "Très arrondi" },
] as const;

/**
 * Inline style carrying the whole dashboard palette, including the status
 * tones. Applied on the `.admin` wrapper.
 */
export function adminThemeStyle(
  theme: AdminThemeLike | null | undefined,
): CSSProperties {
  const t = theme ?? DEFAULT_ADMIN_THEME;
  const tones = isDarkBackground(t.adminBackground) ? TONES.dark : TONES.light;

  const style: Record<string, string> = {
    "--admin-bg": t.adminBackground,
    "--admin-surface": t.adminSurface,
    "--admin-text": t.adminText,
    "--admin-muted": t.adminMuted,
    "--admin-border": t.adminBorder,
    "--admin-accent": t.adminAccent,
    "--admin-radius": ADMIN_RADIUS[t.adminRadius] ?? ADMIN_RADIUS.medium,
    "--admin-font": fontStack(t.adminFont, "system-ui, sans-serif"),
    // Used for form boxes, hovers and code blocks. Derived so it follows the
    // palette instead of needing its own setting.
    "--admin-subtle": `color-mix(in srgb, ${t.adminText} 6%, ${t.adminSurface})`,
    // Text laid over the accent colour: white on a deep accent, near-black on
    // a pale one, so a pastel accent does not make the buttons unreadable.
    "--admin-accent-fg": readableTextOn(t.adminAccent),
    "--brand-primary-fg": readableTextOn(t.adminAccent),
  };

  for (const [name, [bg, fg, border]] of Object.entries(tones) as Array<
    [ToneName, ToneTriplet]
  >) {
    style[`--tone-${name}-bg`] = bg;
    style[`--tone-${name}-fg`] = fg;
    style[`--tone-${name}-border`] = border;
  }

  return style as CSSProperties;
}

/** Flatten `overlay` at `alpha` over `base`, returning an opaque #rrggbb. */
function hexToHex(overlay: string, base: string, alpha: number): string {
  const parse = (hex: string): [number, number, number] => {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) return [0, 0, 0];
    const value = Number.parseInt(match[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };

  const [ro, go, bo] = parse(overlay);
  const [rb, gb, bb] = parse(base);
  const mix = (o: number, b: number) =>
    Math.round(o * alpha + b * (1 - alpha))
      .toString(16)
      .padStart(2, "0");

  return `#${mix(ro, rb)}${mix(go, gb)}${mix(bo, bb)}`;
}

/** rgba() string from a #rrggbb colour, used for subtle borders. */
export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return `rgb(0 0 0 / ${Math.round(alpha * 100)}%)`;

  const value = Number.parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgb(${r} ${g} ${b} / ${Math.round(alpha * 100)}%)`;
}

const INK = "#1c1917";
const PAPER = "#ffffff";

/**
 * Pick near-black or white text for a background.
 *
 * The two candidates are compared by actual WCAG contrast rather than against
 * a luminance threshold. A fixed threshold misjudges mid-tones: a dusty pink
 * like #D89A9B sits just under 0.45, so a threshold picks white and lands at
 * 2.3 to 1, while near-black on the same pink reaches 8 to 1.
 */
export function readableTextOn(hex: string): string {
  if (!/^#?[0-9a-f]{6}$/i.test(hex.trim())) return PAPER;
  return contrastRatio(INK, hex) >= contrastRatio(PAPER, hex) ? INK : PAPER;
}
