import { Suspense } from "react";
import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SkeletonBar } from "@/components/dashboard/ui";
import { formatMoment } from "@/components/admin/ui";

/**
 * The audit trail.
 *
 * Who did what, and to which account. The stored metadata is deliberately not
 * printed: it carries booking references and internal identifiers, and this
 * screen is meant to answer "who touched this account", not to become a side
 * door into a provider's book.
 */

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  "auth.login": "Connexion",
  "platform.provider.created": "Activité créée",
  "platform.provider.updated": "Fiche modifiée",
  "platform.provider.status": "Statut modifié",
  "platform.provider.password_reset": "Mot de passe réinitialisé",
  "platform.impersonation.started": "Session de support ouverte",
  "platform.impersonation.ended": "Session de support fermée",
  "appointment.payment.confirmed": "Acompte confirmé",
  "appointment.payment.rejected": "Acompte refusé",
  "appointment.cancelled": "Rendez-vous annulé",
  "calendar.connected": "Google Calendar connecté",
};

/** A platform act deserves more attention than a provider's daily work. */
const PLATFORM_PREFIX = "platform.";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ portee?: string }>;
}) {
  await requirePlatformAdminPage();
  const { portee } = await searchParams;
  const platformOnly = portee !== "tout";

  return (
    <>
      <PageHeader
        title="Journal"
        description="Les actions enregistrées. Ce journal dit qui est intervenu et sur quel compte, pas ce que contiennent les rendez-vous."
      />

      <nav
        aria-label="Portée du journal"
        style={{ display: "flex", gap: ".4rem", marginBottom: "1.25rem" }}
      >
        <Tab href="/admin/journal" label="Actions plateforme" active={platformOnly} />
        <Tab href="/admin/journal?portee=tout" label="Tout" active={!platformOnly} />
      </nav>

      <Suspense key={portee ?? ""} fallback={<JournalSkeleton />}>
        <Entries platformOnly={platformOnly} />
      </Suspense>

      <style>{`
        .pf-tab {
          display: inline-flex;
          align-items: center;
          padding: .38rem .8rem;
          border-radius: 999px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          color: var(--admin-text);
          font-size: .82rem;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }
        .pf-tab:hover { background: var(--admin-subtle); }
        .pf-tab[data-selected="true"] {
          background: var(--admin-accent);
          border-color: var(--admin-accent);
          color: var(--admin-accent-fg);
        }
        .pf-entry { padding: .7rem .95rem; }
        .pf-entry[data-platform="true"] {
          border-left: 3px solid var(--admin-accent);
        }
      `}</style>
    </>
  );
}

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="pf-tab"
      data-selected={active ? "true" : undefined}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

async function Entries({ platformOnly }: { platformOnly: boolean }) {
  const entries = await prisma.auditLog.findMany({
    where: platformOnly ? { action: { startsWith: PLATFORM_PREFIX } } : undefined,
    select: {
      id: true,
      action: true,
      createdAt: true,
      ipAddress: true,
      user: { select: { name: true, email: true } },
      provider: { select: { id: true, businessName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Rien à afficher"
        description={
          platformOnly
            ? "Aucune action d'administration n'a encore été enregistrée."
            : "Le journal est vide."
        }
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: ".45rem" }}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="card pf-entry"
          data-platform={entry.action.startsWith(PLATFORM_PREFIX) ? "true" : undefined}
        >
          <div
            style={{
              display: "flex",
              gap: ".75rem",
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: ".88rem" }}>
              {LABELS[entry.action] ?? entry.action}
            </span>

            {entry.provider ? (
              <Link
                href={`/admin/prestataires/${entry.provider.id}`}
                style={{ fontSize: ".82rem" }}
              >
                {entry.provider.businessName}
              </Link>
            ) : null}

            <span
              style={{
                marginLeft: "auto",
                fontSize: ".78rem",
                color: "var(--admin-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {formatMoment(entry.createdAt)}
            </span>
          </div>

          <p style={{ margin: ".25rem 0 0", fontSize: ".8rem", color: "var(--admin-muted)" }}>
            {entry.user ? `${entry.user.name} (${entry.user.email})` : "Compte supprimé"}
            {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div style={{ display: "grid", gap: ".45rem" }}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="card pf-entry">
          <SkeletonBar width="45%" height={12} />
        </div>
      ))}
    </div>
  );
}
