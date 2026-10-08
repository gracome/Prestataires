import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Playfair for what the brand says, Inter for what the product does.
 *
 * Loaded through next/font rather than a stylesheet link: the files are served
 * from this origin with the fallback metrics already matched, so a heading
 * does not jump a line once the real face arrives. A provider's own site still
 * overrides --font-heading and --font-body with her chosen pair.
 *
 * The files live in the repository (Fontsource variable builds, OFL-1.1)
 * rather than being fetched from Google at build time. Google sometimes hands
 * the build machine font URLs next/font cannot parse, and the deploy then
 * fails on a stylesheet that has nothing to do with the change being shipped.
 */

const playfair = localFont({
  src: "./fonts/playfair-display-latin-wght.woff2",
  weight: "400 900",
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const inter = localFont({
  src: "./fonts/inter-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  fallback: ["-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Prestataires — votre activité, votre univers",
    template: "%s",
  },
  description:
    "Site professionnel, prise de rendez-vous en ligne, gestion des acomptes et suivi de votre activité, pour les métiers de la beauté et du bien-être.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff9f3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
