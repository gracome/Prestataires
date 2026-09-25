import type { Metadata } from "next";
import { requirePlatformAdminPage } from "@/lib/auth/guard";
import { adminThemeStyle } from "@/lib/theme";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Plateforme",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The platform's own palette.
 *
 * Fixed, and never a provider's: an administrator's screen must not change
 * colour depending on whose account they last looked at. The blue accent is
 * the one thing that says "platform" in the content area, the dark sidebar
 * says it everywhere else.
 */
const PLATFORM_THEME = {
  adminPreset: "custom",
  adminBackground: "#F4F6F8",
  adminSurface: "#FFFFFF",
  adminText: "#1B2028",
  adminMuted: "#646C7A",
  adminBorder: "#E1E5EB",
  adminAccent: "#2E5AAC",
  adminFont: "Inter",
  adminRadius: "medium",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin } = await requirePlatformAdminPage();

  return (
    <AdminShell
      adminName={admin.name}
      adminEmail={admin.email}
      themeStyle={adminThemeStyle(PLATFORM_THEME)}
    >
      {children}
    </AdminShell>
  );
}
