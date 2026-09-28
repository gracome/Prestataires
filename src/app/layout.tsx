import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * Playfair for what the brand says, Inter for what the product does.
 *
 * Loaded through next/font rather than a stylesheet link: the files are served
 * from this origin with the fallback metrics already matched, so a heading
 * does not jump a line once the real face arrives. A provider's own site still
 * overrides --font-heading and --font-body with her chosen pair.
 */

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
