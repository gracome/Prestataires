import { Suspense } from "react";
import Link from "next/link";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { releaseExpiredAppointments } from "@/lib/booking/expiration";
import { BLOCKING_STATUSES } from "@/lib/booking/state-machine";
import { formatMoney } from "@/lib/money";
import {
  addDays,
  formatLocalTime,
  formatLongDateFr,
  localDateTimeToUtc,
  toLocalDate,
} from "@/lib/time";
import {
  PERIOD_PRESETS,
  humanDate,
  periodQuery,
  previousPeriod,
  resolvePeriod,
} from "@/lib/reports/period";
import { compare } from "@/lib/reports/metrics";
import { loadReport } from "@/lib/reports/service";
import {
  Callout,
  EmptyState,
  PageHeader,
  SkeletonBar,
  SkeletonStats,
  StatusPill,
  statGrid,
} from "@/components/dashboard/ui";
import {
  KpiCard,
  MiniBreakdown,
  RevenueChart,
} from "@/components/dashboard/ReportView";
import { PeriodBar } from "@/components/dashboard/PeriodBar";

/**
 * The dashboard: one screen that answers "how is the salon doing" and "what do
 * I have to do now", side by side.
 *
 * The figures are scoped to the period chosen in the header. Everything in the
 * right-hand column is about the days ahead and ignores that period, which is
 * why each of those panels says so in its own words rather than leaving the
 * provider to guess.
 */

export const dynamic = "force-dynamic";

type Query = { periode?: string; du?: string; au?: string };

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  // Only the session lookup is awaited here, so the greeting and the period
  // buttons paint at once and the figures stream in behind them.
  const { provider } = await requireSection("home");
  const query = await searchParams;
  const period = resolvePeriod(query, provider.timezone);

  const presets = PERIOD_PRESETS.map((preset) => ({
    value: preset.value,
    label: preset.label,
    href: `/dashboard?periode=${preset.value}`,
  }));

  return (
    <>
      <PageHeader
        title={`Bonjour ${provider.ownerName.split(" ")[0]}`}
        description={formatLongDateFr(new Date(), provider.timezone)}
      />

      <PeriodBar
        presets={presets}
        active={period.preset}
        label={period.label}
        from={period.from}
        to={period.to}
        basePath="/dashboard"
        exportHref={`/api/reports/export?${periodQuery(period)}`}
      />

      <Suspense key={periodQuery(period)} fallback={<BoardSkeleton />}>
        <Board providerId={provider.id} query={query} />
      </Suspense>
    </>
  );
}

// ---------------------------------------------------------------------------

async function Board({
  providerId,
  query,
}: {
  providerId: string;
  query: Query;
}) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  // Clear lapsed holds first so every count below reflects reality.
  await releaseExpiredAppointments({ providerId: provider.id });

  const tz = provider.timezone;
  const now = new Date();
  const today = toLocalDate(now, tz);
  const dayStart = localDateTimeToUtc(today, 0, tz);
  const dayEnd = localDateTimeToUtc(addDays(today, 1), 0, tz);
  const weekEnd = localDateTimeToUtc(addDays(today, 7), 0, tz);

  const period = resolvePeriod(query, tz);
  const earlier = previousPeriod(period);

  // One round trip for the whole screen. The report is the slowest of these
  // and the agenda the quickest, so running them together costs the slowest
  // one rather than their sum.
  const [
    current,
    comparison,
    todayAppointments,
    upcoming,
    proofsToVerify,
    awaitingPayment,
    weekCount,
    newQuotes,
    calendarConnection,
    activeServices,
    paymentInstructions,
    depositServices,
  ] = await Promise.all([
    loadReport(provider.id, period, tz, now),
    loadReport(provider.id, earlier, tz, now),
    prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        status: { in: [...BLOCKING_STATUSES] },
        startsAt: { gte: dayStart, lt: dayEnd },
      },
      include: { service: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        status: "CONFIRMED",
        startsAt: { gte: dayEnd, lt: weekEnd },
      },
      include: { service: true },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: { providerId: provider.id, status: "PAYMENT_PROOF_SUBMITTED" },
      include: { service: true },
      orderBy: { paymentSubmittedAt: "asc" },
      take: 5,
    }),
    prisma.appointment.count({
      where: {
        providerId: provider.id,
        status: { in: ["TEMPORARILY_RESERVED", "AWAITING_PAYMENT"] },
      },
    }),
    prisma.appointment.count({
      where: {
        providerId: provider.id,
        status: "CONFIRMED",
        startsAt: { gte: dayStart, lt: weekEnd },
      },
    }),
    prisma.quoteRequest.count({ where: { providerId: provider.id, status: "NEW" } }),
    prisma.calendarConnection.findUnique({ where: { providerId: provider.id } }),
    prisma.service.count({ where: { providerId: provider.id, active: true } }),
    prisma.paymentInstruction.count({
      where: { providerId: provider.id, active: true },
    }),
    prisma.service.count({
      where: { providerId: provider.id, active: true, depositRequired: true },
    }),
  ]);

  const money = (minor: number) =>
    formatMoney(minor, provider.currency, provider.locale);
  const figures = current.metrics;
  const before = comparison.metrics;

  return (
    <>
      {provider.status !== "ACTIVE" ? (
        <Callout tone="warning">
          Votre site public n&apos;est pas encore en ligne. Passez le statut à
          &laquo;&nbsp;actif&nbsp;&raquo; depuis les paramètres pour le rendre
          visible.
        </Callout>
      ) : null}

      {activeServices === 0 ? (
        <Callout tone="warning">
          Aucune prestation active : ajoutez vos prestations pour ouvrir la
          réservation en ligne.{" "}
          <Link href="/dashboard/services">Gérer mes prestations</Link>
        </Callout>
      ) : null}

      {depositServices > 0 && paymentInstructions === 0 ? (
        <Callout tone="danger">
          Des prestations demandent un acompte mais aucune instruction de
          paiement n&apos;est enregistrée : vos clientes ne sauront pas où
          envoyer l&apos;argent.{" "}
          <Link href="/dashboard/paiement">Renseigner le paiement</Link>
        </Callout>
      ) : null}

      {calendarConnection?.lastSyncError ? (
        <Callout tone="warning">
          Synchronisation Google Calendar en erreur :{" "}
          {calendarConnection.lastSyncError}{" "}
          <Link href="/dashboard/parametres">Reconnecter</Link>
        </Callout>
      ) : null}

      <p
        style={{
          margin: "0 0 .7rem",
          fontSize: ".82rem",
          color: "var(--admin-muted)",
        }}
      >
        Chiffres du {humanDate(period.from)} au {humanDate(period.to)}, comparés
        aux {period.days} jours précédents.
      </p>

      <div style={{ ...statGrid, marginBottom: "1.25rem" }}>
        <KpiCard
          label="Chiffre d'affaires"
          value={money(figures.revenue)}
          delta={compare(figures.revenue, before.revenue)}
        />
        <KpiCard
          label="Rendez-vous honorés"
          value={String(figures.honoured)}
          delta={compare(figures.honoured, before.honoured)}
          deltaLabel="rendez-vous"
        />
        <KpiCard
          label="Panier moyen"
          value={money(figures.averageBasket)}
          delta={compare(figures.averageBasket, before.averageBasket)}
        />
        <KpiCard
          label="Clientes"
          value={String(figures.customers)}
          hint={`dont ${figures.newCustomers} nouvelle${figures.newCustomers > 1 ? "s" : ""}`}
          delta={compare(figures.customers, before.customers)}
          deltaLabel="clientes"
        />
        <KpiCard
          label="Acomptes encaissés"
          value={money(figures.depositsCollected)}
          delta={compare(figures.depositsCollected, before.depositsCollected)}
        />
        <KpiCard
          label="Taux d'annulation"
          value={`${Math.round(figures.cancellationRate * 100)} %`}
          hint={`${figures.cancelled} sur ${figures.booked} rendez-vous`}
          delta={compare(
            Math.round(figures.cancellationRate * 100),
            Math.round(before.cancellationRate * 100),
          )}
          deltaUnit="points"
          tone="good-down"
        />
      </div>

      <div className="dash-grid">
        {/* Written before the panels on purpose: on a phone the columns stack
            in source order, and what happens today matters more than what
            happened last month. On a laptop the grid areas put it back on the
            right. */}
        <div className="dash-agenda">
          <Panel
            title="À traiter"
            action={
              <Link href="/dashboard/reservations" style={{ fontSize: ".82rem" }}>
                Réservations
              </Link>
            }
          >
            <TodoList
              items={[
                {
                  label: "preuve de paiement à vérifier",
                  plural: "preuves de paiement à vérifier",
                  count: proofsToVerify.length,
                  href: "/dashboard/reservations?statut=PAYMENT_PROOF_SUBMITTED",
                  urgent: true,
                },
                {
                  label: "acompte encore attendu",
                  plural: "acomptes encore attendus",
                  count: awaitingPayment,
                  href: "/dashboard/reservations?statut=AWAITING_PAYMENT",
                },
                {
                  label: "demande de devis sans réponse",
                  plural: "demandes de devis sans réponse",
                  count: newQuotes,
                  href: "/dashboard/devis",
                },
              ]}
            />
          </Panel>

          <Panel
            title="Aujourd'hui"
            hint={
              todayAppointments.length > 0
                ? `${todayAppointments.length} rendez-vous`
                : undefined
            }
          >
            {todayAppointments.length === 0 ? (
              <EmptyState title="Aucun rendez-vous aujourd'hui" />
            ) : (
              <ul style={listStyle}>
                {todayAppointments.map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      href={`/dashboard/reservations/${appointment.id}`}
                      style={rowLinkStyle}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}
                      >
                        {formatLocalTime(appointment.startsAt, tz)}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>
                          {appointment.customerName}
                        </span>
                        <span style={metaStyle}>{appointment.service.name}</span>
                      </span>
                      <StatusPill status={appointment.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Les 7 prochains jours"
            hint={`${weekCount} confirmé${weekCount > 1 ? "s" : ""}`}
            action={
              <Link href="/dashboard/calendrier" style={{ fontSize: ".82rem" }}>
                Calendrier
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <EmptyState title="Rien de prévu cette semaine" />
            ) : (
              <ul style={listStyle}>
                {upcoming.map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      href={`/dashboard/reservations/${appointment.id}`}
                      style={rowLinkStyle}
                    >
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>
                          {formatLongDateFr(appointment.startsAt, tz)} ·{" "}
                          {formatLocalTime(appointment.startsAt, tz)}
                        </span>
                        <span style={metaStyle}>
                          {appointment.customerName} · {appointment.service.name}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="dash-perf">
          <Panel
            title="Activité jour par jour"
            hint="rendez-vous honorés uniquement"
          >
            <RevenueChart
              points={figures.daily}
              formatAmount={money}
              formatDate={(date) =>
                humanDate(date as `${number}-${number}-${number}`)
              }
              framed={false}
              height={190}
            />
          </Panel>

          <Panel
            title="Ce qui rapporte"
            action={
              <Link
                href={`/dashboard/rapports?${periodQuery(period)}`}
                style={{ fontSize: ".82rem" }}
              >
                Tout le classement
              </Link>
            }
          >
            <MiniBreakdown
              rows={figures.byService}
              formatAmount={money}
              emptyLabel="Aucun rendez-vous honoré sur cette période."
            />
          </Panel>

          <Panel title="Par catégorie">
            <MiniBreakdown
              rows={figures.byCategory}
              formatAmount={money}
              emptyLabel="Aucun rendez-vous honoré sur cette période."
              limit={4}
            />
          </Panel>
        </div>
      </div>

      <style>{`
        .dash-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        .dash-agenda, .dash-perf {
          display: grid;
          gap: 1rem;
          align-content: start;
          min-width: 0;
        }
        @media (min-width: 1040px) {
          .dash-grid {
            grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
            grid-template-areas: "perf agenda";
          }
          .dash-agenda { grid-area: agenda; }
          .dash-perf { grid-area: perf; }
        }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------

/** A dashboard panel: a card with a title bar, used for every widget. */
function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: ".75rem",
          flexWrap: "wrap",
          marginBottom: ".85rem",
        }}
      >
        <h2 style={{ fontSize: ".98rem", margin: 0, fontWeight: 700 }}>{title}</h2>
        {hint ? (
          <span style={{ fontSize: ".8rem", color: "var(--admin-muted)" }}>
            {hint}
          </span>
        ) : null}
        {action ? <span style={{ marginLeft: "auto" }}>{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

type Todo = {
  label: string;
  plural: string;
  count: number;
  href: string;
  urgent?: boolean;
};

/** What is waiting for the provider, with the quiet cases left out. */
function TodoList({ items }: { items: Todo[] }) {
  const pending = items.filter((item) => item.count > 0);

  if (pending.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: ".88rem", color: "var(--admin-muted)" }}>
        Rien en attente. Tout est à jour.
      </p>
    );
  }

  return (
    <ul style={listStyle}>
      {pending.map((item) => (
        <li key={item.href}>
          <Link href={item.href} style={rowLinkStyle}>
            <span
              className={item.urgent ? "pill pill-danger" : "pill pill-neutral"}
              style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
            >
              {item.count}
            </span>
            <span style={{ fontSize: ".9rem", minWidth: 0, flex: 1 }}>
              {item.count > 1 ? item.plural : item.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BoardSkeleton() {
  return (
    <>
      <SkeletonStats count={6} />
      <div className="dash-grid-skeleton">
        {[220, 150, 150].map((height, index) => (
          <div key={index} className="card">
            <SkeletonBar width="40%" height={13} />
            <div style={{ marginTop: ".9rem" }}>
              <SkeletonBar width="100%" height={height} />
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .dash-grid-skeleton { display: grid; gap: 1rem; }
        @media (min-width: 1040px) {
          .dash-grid-skeleton { grid-template-columns: minmax(0,1.55fr) minmax(0,1fr); }
          .dash-grid-skeleton > :first-child { grid-row: span 2; }
        }
      `}</style>
    </>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: ".1rem",
};

const rowLinkStyle: React.CSSProperties = {
  display: "flex",
  gap: ".7rem",
  alignItems: "center",
  padding: ".5rem .4rem",
  margin: "0 -.4rem",
  borderRadius: 8,
  textDecoration: "none",
  color: "inherit",
};

const metaStyle: React.CSSProperties = {
  display: "block",
  marginTop: ".15rem",
  fontSize: ".82rem",
  color: "var(--admin-muted)",
};
