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

/**
 * Inline style object carrying the provider palette.
 *
 * Every `--brand-*` the stylesheet reads is written here, including the ones
 * that look like platform decoration. The defaults in `globals.css` named
 * colours rather than roles — a rose, a cream, a chocolate — and anything not
 * overridden stayed the platform's own. That is how a hundred sites end up
 * wearing the same pink button whatever palette their owner chose.
 */
export function themeStyle(theme: ThemeLike | null | undefined): CSSProperties {
  const t = theme ?? DEFAULT_THEME;

  // The colour actions are painted in. A pale primary cannot carry text, so it
  // is deepened until its own label is readable on it; a primary that already
  // works is left exactly as she picked it.
  const strong = readableActionColor(t.primaryColor);

  return {
    "--brand-primary": t.primaryColor,
    "--brand-primary-strong": strong,
    "--brand-primary-fg": readableTextOn(strong),
    "--brand-secondary": t.secondaryColor,
    "--brand-accent": t.accentColor,
    "--brand-background": t.backgroundColor,
    "--brand-surface": t.surfaceColor,
    "--brand-text": t.textColor,
    "--brand-muted": t.mutedTextColor,
    "--brand-border": hexToRgba(t.textColor, 0.12),
    "--brand-radius": RADIUS[t.buttonRadius] ?? RADIUS.full,

    // The three the stylesheet still calls by colour name. Mapped to the role
    // each one actually plays, so a provider's palette reaches them too.
    "--brand-chocolate": t.secondaryColor,
    "--brand-cream": t.backgroundColor,
    "--brand-beige": t.accentColor,
    // Soft washes of her primary, flattened over her own surface rather than
    // over white: on a dark site a translucent tint would turn muddy.
    "--brand-rose-light": hexToHex(t.primaryColor, t.surfaceColor, 0.16),
    "--brand-rose-pale": hexToHex(t.primaryColor, t.surfaceColor, 0.07),
    "--brand-rose": t.primaryColor,

    "--font-heading": fontStack(t.headingFont, "Georgia, serif"),
    "--font-body": fontStack(t.bodyFont, "system-ui, sans-serif"),
    backgroundColor: t.backgroundColor,
    color: t.textColor,
  } as CSSProperties;
}

/** Contrast a button's label must reach against its own background. */
const ACTION_CONTRAST = 4.5;

/**
 * Deepen a colour until it can carry a label.
 *
 * A provider is free to choose a pastel, and a pastel button with white text
 * is unreadable. Rather than refusing her colour or silently swapping it, the
 * action surface is walked towards black or white until its best foreground
 * reaches the threshold. A colour that already passes comes back untouched.
 */
export function readableActionColor(hex: string): string {
  const parsed = parseHex(hex);
  if (!parsed) return hex;

  const best = (colour: string) =>
    Math.max(contrastRatio(INK, colour), contrastRatio(PAPER, colour));

  if (best(hex) >= ACTION_CONTRAST) return normaliseHex(parsed);

  // Toward black for a light colour, toward white for a dark one: whichever
  // direction its own text is already heading.
  const towardsBlack = relativeLuminance(hex) > 0.18;
  const target: [number, number, number] = towardsBlack ? [0, 0, 0] : [255, 255, 255];

  let candidate = parsed;
  // Twenty steps of five per cent: fine enough that the result still reads as
  // her colour, and bounded so this can never spin.
  for (let step = 1; step <= 20; step += 1) {
    const ratio = step * 0.05;
    candidate = [
      Math.round(parsed[0] + (target[0] - parsed[0]) * ratio),
      Math.round(parsed[1] + (target[1] - parsed[1]) * ratio),
      Math.round(parsed[2] + (target[2] - parsed[2]) * ratio),
    ];
    if (best(normaliseHex(candidate)) >= ACTION_CONTRAST) break;
  }

  return normaliseHex(candidate);
}

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function normaliseHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
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
  adminBackground: "#F6F6F7",
  adminSurface: "#FFFFFF",
  adminText: "#1F1E22",
  adminMuted: "#6B6A72",
  adminBorder: "#E5E4E9",
  adminAccent: "#D6336C",
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
    // Grey that is actually grey. The earlier values carried a brown tint —
    // they said "neutre" and looked like weak coffee, and the accent that went
    // with them was a muddy mauve-brown that nothing else on the platform
    // wore. The accent is now the brand rose, which is also what a provider
    // sees on her public site and on our own pages.
    colors: {
      adminBackground: "#F6F6F7",
      adminSurface: "#FFFFFF",
      adminText: "#1F1E22",
      adminMuted: "#6B6A72",
      adminBorder: "#E5E4E9",
      adminAccent: "#D6336C",
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
      // Sand keeps its warm neutrals — that is the whole point of it — but
      // the accent moves off brown, which on beige read as another shade of
      // background rather than as something to click.
      adminAccent: "#C0456E",
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
