import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDurationFr } from "@/lib/time";
import {
  PERIOD_PRESETS,
  humanDate,
  periodQuery,
  previousPeriod,
  resolvePeriod,
} from "@/lib/reports/period";
import { compare } from "@/lib/reports/metrics";
import { computeOpenMinutes, loadReport } from "@/lib/reports/service";
import { tillBreakdown, tillRevenue } from "@/lib/till/service";
import { Section, SkeletonStats, SkeletonTable, statGrid } from "./ui";
import { BreakdownTable, KpiCard, RevenueChart } from "./ReportView";
import { PeriodBar } from "./PeriodBar";

/**
 * The exhaustive report.
 *
 * The dashboard already answers "how am I doing" at a glance, with the top of
 * each ranking. This is the long form: every prestation, every category, and
 * the secondary figures that do not deserve a panel of their own.
 *
 * The outer component awaits nothing, so the period buttons are clickable
 * while the figures behind them are still being counted.
 */

export type ReportQuery = { periode?: string; du?: string; au?: string };

export function ReportSection({
  providerId,
  timezone,
  query,
  basePath,
}: {
  providerId: string;
  timezone: string;
  query: ReportQuery;
  /** Where the period buttons point back to. */
  basePath: string;
}) {
  // Period arithmetic needs no database, so the picker paints with the page.
  const period = resolvePeriod(query, timezone);

  const presets = PERIOD_PRESETS.map((preset) => ({
    value: preset.value,
    label: preset.label,
    href: `${basePath}?periode=${preset.value}`,
  }));

  return (
    <section id="rapports" style={{ scrollMarginTop: "1.5rem" }}>
      <PeriodBar
        presets={presets}
        active={period.preset}
        label={period.label}
        from={period.from}
        to={period.to}
        basePath={basePath}
        exportHref={`/api/reports/export?${periodQuery(period)}`}
      />

      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: ".85rem",
          color: "var(--admin-muted)",
          lineHeight: 1.6,
        }}
      >
        {period.label}, comparé à {previousPeriod(period).label.toLowerCase()}.
      </p>

      <Suspense
        key={periodQuery(period)}
        fallback={
          <>
            <SkeletonStats count={6} />
            <SkeletonTable rows={5} />
          </>
        }
      >
        <ReportBody providerId={providerId} query={query} />
      </Suspense>
    </section>
  );
}

async function ReportBody({
  providerId,
  query,
}: {
  providerId: string;
  query: ReportQuery;
}) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  const period = resolvePeriod(query, provider.timezone);
  const earlier = previousPeriod(period);

  const [current, comparison, openMinutes, till, tillBefore, tillTop] =
    await Promise.all([
      loadReport(provider.id, period, provider.timezone),
      loadReport(provider.id, earlier, provider.timezone),
      computeOpenMinutes(provider.id, period, provider.timezone),
      tillRevenue(provider.id, period.from, period.to, provider.timezone),
      tillRevenue(provider.id, earlier.from, earlier.to, provider.timezone),
      tillBreakdown(provider.id, period.from, period.to, provider.timezone),
    ]);

  const money = (minor: number) =>
    formatMoney(minor, provider.currency, provider.locale);
  const now = current.metrics;
  const before = comparison.metrics;

  const occupancy = openMinutes > 0 ? now.bookedMinutes / openMinutes : 0;

  return (
    <>
      <div style={{ ...statGrid, marginBottom: "2rem" }}>
        <KpiCard
          label="Total encaissé"
          value={money(now.revenue + till.amount)}
          hint="Réservations en ligne et caisse réunies."
          delta={compare(now.revenue + till.amount, before.revenue + tillBefore.amount)}
        />
        <KpiCard
          label="Dont réservations en ligne"
          value={money(now.revenue)}
          hint="Rendez-vous honorés uniquement."
          delta={compare(now.revenue, before.revenue)}
        />
        <KpiCard
          label="Dont caisse"
          value={money(till.amount)}
          hint={`${till.count} encaissement${till.count > 1 ? "s" : ""} saisis`}
          delta={compare(till.amount, tillBefore.amount)}
        />
        <KpiCard
          label="Rendez-vous honorés"
          value={String(now.honoured)}
          hint={now.upcoming > 0 ? `${now.upcoming} encore à venir` : undefined}
          delta={compare(now.honoured, before.honoured)}
          deltaLabel="rendez-vous"
        />
        <KpiCard
          label="Panier moyen"
          value={money(now.averageBasket)}
          delta={compare(now.averageBasket, before.averageBasket)}
        />
        <KpiCard
          label="Clientes"
          value={String(now.customers)}
          hint={`dont ${now.newCustomers} nouvelle${now.newCustomers > 1 ? "s" : ""}`}
          delta={compare(now.customers, before.customers)}
          deltaLabel="clientes"
        />
        <KpiCard
          label="Acomptes encaissés"
          value={money(now.depositsCollected)}
          delta={compare(now.depositsCollected, before.depositsCollected)}
        />
        <KpiCard
          label="Taux d'annulation"
          value={`${Math.round(now.cancellationRate * 100)} %`}
          hint={`${now.cancelled} annulation${now.cancelled > 1 ? "s" : ""} sur ${now.booked} rendez-vous`}
          delta={compare(
            Math.round(now.cancellationRate * 100),
            Math.round(before.cancellationRate * 100),
          )}
          deltaUnit="points"
          tone="good-down"
        />
      </div>

      <Section
        title="Activité jour par jour"
        description="Seuls les rendez-vous honorés comptent dans le chiffre d'affaires."
      >
        <RevenueChart
          points={now.daily}
          formatAmount={money}
          formatDate={(date) => humanDate(date as `${number}-${number}-${number}`)}
        />
      </Section>

      <Section
        title="Ce qui rapporte"
        description="Vos prestations classées par chiffre d'affaires sur la période."
      >
        <BreakdownTable
          rows={now.byService}
          formatAmount={money}
          firstColumn="Prestation"
          emptyLabel="Aucun rendez-vous honoré sur cette période."
        />
      </Section>

      <Section title="Par catégorie">
        <BreakdownTable
          rows={now.byCategory}
          formatAmount={money}
          firstColumn="Catégorie"
          emptyLabel="Aucun rendez-vous honoré sur cette période."
        />
      </Section>

      {tillTop.length > 0 ? (
        <Section
          title="Ce que vous encaissez en caisse"
          description="Les prestations saisies à la main, hors réservation en ligne."
        >
          <div className="card table-scroll" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Prestation</th>
                  <th scope="col">Fois</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {tillTop.map((row) => (
                  <tr key={row.label}>
                    <td style={{ fontWeight: 600 }}>{row.label}</td>
                    <td>{row.count}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <Section
        title="Le reste de la période"
        description="Ce qui n'a pas abouti, et le temps de travail réellement occupé."
      >
        <div style={statGrid}>
          <KpiCard
            label="Temps travaillé"
            value={formatDurationFr(now.bookedMinutes)}
            hint={
              openMinutes > 0
                ? `${Math.round(occupancy * 100)} % de vos heures d'ouverture`
                : "Renseignez vos horaires pour connaître votre taux d'occupation."
            }
            delta={compare(now.bookedMinutes, before.bookedMinutes)}
            deltaLabel="min"
          />
          <KpiCard
            label="Absences"
            value={String(now.noShow)}
            hint="Clientes qui ne sont pas venues."
            delta={compare(now.noShow, before.noShow)}
            deltaLabel="absences"
            tone="good-down"
          />
          <KpiCard
            label="Réservations expirées"
            value={String(now.expired)}
            hint="Acompte jamais envoyé, créneau libéré."
            delta={compare(now.expired, before.expired)}
            deltaLabel="expirations"
            tone="good-down"
          />
          <KpiCard
            label="Acomptes refusés"
            value={String(now.rejected)}
            delta={compare(now.rejected, before.rejected)}
            deltaLabel="refus"
            tone="good-down"
          />
          <KpiCard
            label="À venir sur la période"
            value={money(now.expectedRevenue)}
            hint={`${now.upcoming} rendez-vous pas encore passés`}
            tone="neutral"
          />
          <KpiCard
            label="Clientes fidèles"
            value={String(now.returningCustomers)}
            hint="Déjà venues avant cette période."
            delta={compare(now.returningCustomers, before.returningCustomers)}
            deltaLabel="clientes"
          />
        </div>
      </Section>

      <p style={{ fontSize: ".82rem", color: "var(--admin-muted)", lineHeight: 1.7 }}>
        Période analysée : du {humanDate(period.from)} au {humanDate(period.to)}.
        Comparaison : du {humanDate(earlier.from)} au {humanDate(earlier.to)}. Un
        rendez-vous est rattaché à la date à laquelle il a lieu, pas à celle où il a
        été réservé.
      </p>
    </>
  );
}
