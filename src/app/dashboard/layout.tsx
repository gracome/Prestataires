import type { Metadata } from "next";
import { requireProviderPage } from "@/lib/auth/guard";
import { featuresOf } from "@/lib/auth/features";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { adminThemeStyle } from "@/lib/theme";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner";

export const metadata: Metadata = {
  title: "Tableau de bord",
  robots: { index: false, follow: false },
  // Declared on the workspace only, never on a provider's public site: a
  // customer browsing a salon must not be offered to install the salon's
  // back office. It is also what lets an iPhone add this to the home screen,
  // which Apple requires before it will deliver a push notification at all.
  manifest: "/dashboard.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mon espace",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, provider } = await requireProviderPage();

  // Counters shown as badges in the menu, so the provider sees at a glance
  // what is waiting for them.
  const [proofsToVerify, newQuotes, theme, session] = await Promise.all([
    prisma.appointment.count({
      where: { providerId: provider.id, status: "PAYMENT_PROOF_SUBMITTED" },
    }),
    prisma.quoteRequest.count({
      where: { providerId: provider.id, status: "NEW" },
    }),
    prisma.theme.findUnique({ where: { providerId: provider.id } }),
    getSessionContext(),
  ]);

  return (
    <>
      {/* Outside the shell, above everything: a support session must be the
          first thing on the screen, not something inside a panel that can be
          scrolled past. */}
      {session?.impersonator ? (
        <ImpersonationBanner
          adminName={session.impersonator.name}
          businessName={provider.businessName}
        />
      ) : null}

      <DashboardShell
        businessName={provider.businessName}
        userName={user.name}
        slug={provider.slug}
        badges={{ reservations: proofsToVerify, devis: newQuotes }}
        themeStyle={adminThemeStyle(theme)}
        role={user.role}
        features={[...featuresOf(provider)]}
      >
        {children}
      </DashboardShell>
    </>
  );
}
