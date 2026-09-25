import { Suspense } from "react";
import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import {
  PERIOD_PRESETS,
  humanDate,
  periodQuery,
  previousPeriod,
  resolvePeriod,
} from "@/lib/reports/period";
import { compare } from "@/lib/reports/metrics";
import {
  PLATFORM_TIMEZONE,
  needsAttention,
  platformMetrics,
  rankProviders,
} from "@/lib/platform/metrics";
import {
  EmptyState,
  PageHeader,
  SkeletonBar,
  SkeletonStats,
  statGrid,
} from "@/components/dashboard/ui";
import { KpiCard, RevenueChart } from "@/components/dashboard/ReportView";
import { PeriodBar } from "@/components/dashboard/PeriodBar";
import { Panel, StatusTag, formatDay, formatMoment } from "@/components/admin/ui";

/**
 * The platform, at a glance.
 *
 * Built from the same components as a provider's dashboard, because the person
 * running the platform needs the same thing she does: figures that carry their
 * comparison, and a column telling them what to do today.
 *
 * Aggregates only. Nothing here names a customer or opens an appointment.
 */

export const dynamic = "force-dynamic";

type Query = { periode?: string; du?: string; au?: string };

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { admin } = await requirePlatformAdminPage();
  const query = await searchParams;
  const period = resolvePeriod(query, PLATFORM_TIMEZONE);

  const presets = PERIOD_PRESETS.map((preset) => ({
    value: preset.value,
    label: preset.label,
    href: `/admin?periode=${preset.value}`,
  }));

  return (
    <>
      <PageHeader
        title={`Bonjour ${admin.name.split(" ")[0]}`}
        description="L'état de la plateforme. Les chiffres sont des totaux : les données des clientes ne se lisent pas depuis ici."
        action={
          <Link href="/admin/prestataires/nouveau" className="btn btn-primary">
            Créer une activité
          </Link>
        }
      />

      <PeriodBar
        presets={presets}
        active={period.preset}
        label={period.label}
        from={period.from}
        to={period.to}
        basePath="/admin"
      />

      <Suspense key={periodQuery(period)} fallback={<BoardSkeleton />}>
        <Board query={query} />
      </Suspense>
    </>
  );
}

async function Board({ query }: { query: Query }) {
  const period = resolvePeriod(query, PLATFORM_TIMEZONE);
  const earlier = previousPeriod(period);

  const [now, before, ranking, attention, recent, journal] = await Promise.all([
    platformMetrics(period),
    platformMetrics(earlier),
    rankProviders(period),
    needsAttention(),
    prisma.provider.findMany({
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        status: true,
        city: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.auditLog.findMany({
      where: { action: { startsWith: "platform." } },
      select: {
        id: true,
        action: true,
        createdAt: true,
        user: { select: { name: true } },
        provider: { select: { id: true, businessName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const bookings = (value: number) =>
    `${value} rendez-vous${value > 1 ? "" : ""}`;

  return (
    <>
      <p style={{ margin: "0 0 .7rem", fontSize: ".82rem", color: "var(--admin-muted)" }}>
        Chiffres du {humanDate(period.from)} au {humanDate(period.to)}, comparés
        aux {period.days} jours précédents. La plateforme se mesure en activité,
        pas en chiffre d&apos;affaires.
      </p>

      <div style={{ ...statGrid, marginBottom: "1.25rem" }}>
        <KpiCard
          label="Rendez-vous"
          value={String(now.appointments)}
          hint={`${now.honoured} honorés`}
          delta={compare(now.appointments, before.appointments)}
          deltaLabel="rendez-vous"
        />
        <KpiCard
          label="Activités en ligne"
          value={String(now.active)}
          hint={`${now.draft} en brouillon · ${now.suspended} suspendue${now.suspended > 1 ? "s" : ""}`}
          delta={compare(now.active, before.active)}
          deltaLabel="activités"
        />
        <KpiCard
          label="Nouvelles activités"
          value={String(now.created)}
          hint="créées sur la période"
          delta={compare(now.created, before.created)}
          deltaLabel="activités"
        />
        <KpiCard
          label="Activités qui tournent"
          value={String(now.trading)}
          hint={
            now.providers > 0
              ? `${Math.round((now.trading / now.providers) * 100)} % du parc`
              : undefined
          }
          delta={compare(now.trading, before.trading)}
          deltaLabel="activités"
        />
        <KpiCard
          label="Demandes de devis"
          value={String(now.quotes)}
          hint="reçues sur la période"
          delta={compare(now.quotes, before.quotes)}
          deltaLabel="demandes"
        />
        <KpiCard
          label="Rendez-vous perdus"
          value={String(now.cancelled)}
          hint="annulations et absences"
          delta={compare(now.cancelled, before.cancelled)}
          deltaLabel="rendez-vous"
          tone="good-down"
        />
      </div>

      <div className="pf-columns">
        <div className="pf-side">
          <Panel
            title="À surveiller"
            hint={attention.length > 0 ? `${attention.length} activité${attention.length > 1 ? "s" : ""}` : undefined}
          >
            {attention.length === 0 ? (
              <p style={{ margin: 0, fontSize: ".88rem", color: "var(--admin-muted)" }}>
                Rien à signaler. Toutes les activités sont en ordre.
              </p>
            ) : (
              <ul className="pf-rows">
                {attention.slice(0, 8).map((item) => (
                  <li key={`${item.providerId}-${item.reason}`}>
                    <Link href={`/admin/prestataires/${item.providerId}`} className="pf-row">
                      <span className={`pill pill-${item.tone === "danger" ? "danger" : item.tone === "warning" ? "pending" : "neutral"}`} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>
                          {item.businessName}
                        </span>
                        <span className="pf-meta">{item.reason}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Dernières créations"
            action={
              <Link href="/admin/prestataires" style={{ fontSize: ".82rem" }}>
                Toutes
              </Link>
            }
          >
            {recent.length === 0 ? (
              <EmptyState title="Aucune activité" />
            ) : (
              <ul className="pf-rows">
                {recent.map((provider) => (
                  <li key={provider.id}>
                    <Link href={`/admin/prestataires/${provider.id}`} className="pf-row">
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>
                          {provider.businessName}
                        </span>
                        <span className="pf-meta">
                          {provider.ownerName}
                          {provider.city ? ` · ${provider.city}` : ""} ·{" "}
                          {formatDay(provider.createdAt)}
                        </span>
                      </span>
                      <StatusTag status={provider.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Dernières actions"
            action={
              <Link href="/admin/journal" style={{ fontSize: ".82rem" }}>
                Journal
              </Link>
            }
          >
            {journal.length === 0 ? (
              <p style={{ margin: 0, fontSize: ".88rem", color: "var(--admin-muted)" }}>
                Aucune action d&apos;administration enregistrée.
              </p>
            ) : (
              <ul className="pf-rows">
                {journal.map((entry) => (
                  <li key={entry.id}>
                    <span className="pf-row" style={{ cursor: "default" }}>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                        <span className="pf-meta">
                          {entry.provider?.businessName ?? "—"} ·{" "}
                          {entry.user?.name ?? "compte supprimé"} ·{" "}
                          {formatMoment(entry.createdAt)}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="pf-side">
          <Panel title="Activité jour par jour" hint="tous statuts confondus">
            <RevenueChart
              points={now.daily}
              measure="count"
              measureLabel="Rendez-vous"
              formatAmount={bookings}
              formatDate={(date) => humanDate(date as `${number}-${number}-${number}`)}
              framed={false}
              height={190}
            />
          </Panel>

          <Panel
            title="Les plus actives"
            hint={`sur ${period.label.toLowerCase()}`}
          >
            {ranking.length === 0 ? (
              <p style={{ margin: 0, fontSize: ".88rem", color: "var(--admin-muted)" }}>
                Aucun rendez-vous sur cette période.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">Activité</th>
                      <th scope="col">Rendez-vous</th>
                      <th scope="col">Honorés</th>
                      <th scope="col">Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/admin/prestataires/${row.id}`}>
                            {row.businessName}
                          </Link>
                        </td>
                        <td>{row.appointments}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{row.honoured}</td>
                        <td style={{ minWidth: 110 }}>
                          <span className="pf-share">
                            <span aria-hidden="true">
                              <span style={{ width: `${Math.round(row.share * 100)}%` }} />
                            </span>
                            {Math.round(row.share * 100)} %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <style>{`
        .pf-columns { display: grid; gap: 1rem; }
        .pf-side { display: grid; gap: 1rem; align-content: start; min-width: 0; }
        @media (min-width: 1060px) {
          .pf-columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); }
        }
        .pf-rows { list-style: none; margin: 0; padding: 0; display: grid; gap: .1rem; }
        .pf-row {
          display: flex;
          gap: .7rem;
          align-items: center;
          padding: .5rem .4rem;
          margin: 0 -.4rem;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
        }
        a.pf-row:hover { background: var(--admin-subtle); }
        .pf-meta {
          display: block;
          margin-top: .15rem;
          font-size: .8rem;
          color: var(--admin-muted);
        }
        .pf-rows .pill { width: 10px; height: 10px; padding: 0; border-radius: 999px; flex-shrink: 0; }
        .pf-share {
          display: flex;
          align-items: center;
          gap: .5rem;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .pf-share > span[aria-hidden] {
          flex: 1;
          height: 6px;
          min-width: 34px;
          border-radius: 999px;
          background: var(--admin-subtle);
          overflow: hidden;
        }
        .pf-share > span[aria-hidden] > span {
          display: block;
          height: 100%;
          background: var(--admin-accent);
        }
      `}</style>
    </>
  );
}

const ACTION_LABELS: Record<string, string> = {
  "platform.provider.created": "Activité créée",
  "platform.provider.updated": "Fiche modifiée",
  "platform.provider.status": "Statut modifié",
  "platform.provider.password_reset": "Mot de passe réinitialisé",
  "platform.impersonation.started": "Session de support ouverte",
  "platform.impersonation.ended": "Session de support fermée",
};

function BoardSkeleton() {
  return (
    <>
      <SkeletonStats count={6} />
      <div style={{ display: "grid", gap: "1rem" }}>
        {[150, 210].map((height, index) => (
          <div key={index} className="card">
            <SkeletonBar width="35%" height={13} />
            <div style={{ marginTop: ".9rem" }}>
              <SkeletonBar width="100%" height={height} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
