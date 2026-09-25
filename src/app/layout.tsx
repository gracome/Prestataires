import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Prestataire — site professionnel et réservation en ligne",
    template: "%s",
  },
  description:
    "Site professionnel, prise de rendez-vous en ligne, gestion des acomptes et synchronisation du calendrier pour les prestataires sur rendez-vous.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#b0797a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
