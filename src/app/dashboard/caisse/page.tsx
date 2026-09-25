import { Suspense } from "react";
import Link from "next/link";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatMoney, toMajorUnits } from "@/lib/money";
import {
  addDays,
  formatLocalTime,
  formatLongDateFr,
  toLocalDate,
  type LocalDate,
} from "@/lib/time";
import {
  PAYMENT_METHODS,
  loadDay,
  methodLabelFr,
  tillBreakdown,
  tillRevenue,
} from "@/lib/till/service";
import {
  PageHeader,
  Section,
  SkeletonList,
  SkeletonStats,
  StatCard,
  statGrid,
} from "@/components/dashboard/ui";
import { TillForm } from "@/components/dashboard/TillForm";
import { TillList } from "@/components/dashboard/TillList";

/**
 * The till.
 *
 * Most of a salon's day never passes through the booking form: the walk-in,
 * the regular who calls, the neighbour. This screen is where those are written
 * down, so the reports describe the whole business rather than the online
 * fraction of it.
 *
 * One day at a time, because that is how a till is counted.
 */

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CaissePage({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string }>;
}) {
  const { provider } = await requireSection("till");
  const { jour } = await searchParams;

  const today = toLocalDate(new Date(), provider.timezone);
  // An unreadable date falls back to today rather than erroring: the till is
  // opened between two customers, not studied.
  const date = (jour && DATE.test(jour) ? jour : today) as LocalDate;

  const services = await prisma.service.findMany({
    where: { providerId: provider.id, active: true, priceType: { not: "QUOTE_ONLY" } },
    select: { id: true, name: true, price: true },
    orderBy: { position: "asc" },
  });

  const previous = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <>
      <PageHeader
        title="Caisse"
        description="Enregistrez ici ce que vous encaissez hors réservation en ligne. Vos rapports additionnent les deux."
      />

      <nav className="till-days" aria-label="Journée">
        <Link href={`/dashboard/caisse?jour=${previous}`} className="btn btn-secondary">
          ← Veille
        </Link>

        <form method="get" className="till-pick">
          <label className="visually-hidden" htmlFor="jour">
            Journée
          </label>
          <input id="jour" name="jour" type="date" className="input" defaultValue={date} />
          <button type="submit" className="btn btn-secondary">
            Voir
          </button>
        </form>

        {date < today ? (
          <Link href={`/dashboard/caisse?jour=${next}`} className="btn btn-secondary">
            Lendemain →
          </Link>
        ) : null}

        {date !== today ? (
          <Link href="/dashboard/caisse" style={{ fontSize: ".85rem" }}>
            Revenir à aujourd&apos;hui
          </Link>
        ) : null}
      </nav>

      <p style={{ margin: "0 0 1.25rem", fontSize: ".9rem", fontWeight: 600 }}>
        {formatLongDateFr(new Date(`${date}T12:00:00Z`), "UTC")}
      </p>

      <Section
        title="Nouvel encaissement"
        description="Choisissez une prestation pour remplir le nom et le prix, ou saisissez autre chose."
      >
        <div className="card">
          <TillForm
            services={services.map((service) => ({
              id: service.id,
              name: service.name,
              price: String(toMajorUnits(service.price, provider.currency)),
            }))}
            methods={PAYMENT_METHODS}
            date={date}
            time={formatLocalTime(new Date(), provider.timezone)}
            currency={provider.currency}
          />
        </div>
      </Section>

      <Suspense key={date} fallback={<DaySkeleton />}>
        <Day providerId={provider.id} date={date} />
      </Suspense>

      <style>{`
        .till-days {
          display: flex;
          gap: .6rem;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: .75rem;
        }
        .till-pick { display: flex; gap: .4rem; }
        .till-pick .input { min-height: 42px; }
      `}</style>
    </>
  );
}

async function Day({
  providerId,
  date,
}: {
  providerId: string;
  date: LocalDate;
}) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  const [day, month, breakdown] = await Promise.all([
    loadDay(provider.id, date, provider.timezone),
    tillRevenue(
      provider.id,
      (date.slice(0, 8) + "01") as LocalDate,
      date,
      provider.timezone,
    ),
    tillBreakdown(
      provider.id,
      (date.slice(0, 8) + "01") as LocalDate,
      date,
      provider.timezone,
      6,
    ),
  ]);

  const money = (amount: number) =>
    formatMoney(amount, provider.currency, provider.locale);

  return (
    <>
      <div style={{ ...statGrid, marginBottom: "1.5rem" }}>
        <StatCard label="Total de la journée" value={money(day.total)} />
        <StatCard
          label="Saisi en caisse"
          value={money(day.tillTotal)}
          hint="hors réservation en ligne"
        />
        <StatCard
          label="Réservations en ligne"
          value={money(day.bookingTotal)}
          hint="rendez-vous du jour"
        />
        <StatCard
          label="Depuis le 1er du mois"
          value={money(month.amount)}
          hint={`${month.count} encaissement${month.count > 1 ? "s" : ""} saisis`}
        />
      </div>

      {day.byMethod.length > 0 ? (
        <Section
          title="Comment on vous a payée"
          description="Sur les encaissements saisis à la main. Les réservations en ligne ne portent pas de moyen de paiement."
        >
          <div style={statGrid}>
            {day.byMethod.map((row) => (
              <StatCard
                key={row.method}
                label={row.label}
                value={money(row.amount)}
                hint={`${row.count} ligne${row.count > 1 ? "s" : ""}`}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Le détail de la journée" description={`${day.count} ligne${day.count > 1 ? "s" : ""}`}>
        <div className="card">
          <TillList
            rows={day.entries.map((entry) => ({
              id: entry.id,
              label: entry.label,
              amountLabel: money(entry.amount),
              methodLabel: entry.method ? methodLabelFr(entry.method) : null,
              customerName: entry.customerName,
              note: entry.note,
              timeLabel: formatLocalTime(entry.occurredAt, provider.timezone),
              source: entry.source,
              href: entry.href,
            }))}
          />
        </div>
      </Section>

      {breakdown.length > 0 ? (
        <Section
          title="Ce que vous vendez le plus en caisse"
          description="Depuis le début du mois, sur les encaissements saisis."
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
                {breakdown.map((row) => (
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
    </>
  );
}

function DaySkeleton() {
  return (
    <>
      <SkeletonStats count={4} />
      <SkeletonList count={4} label="Chargement de la journée…" />
    </>
  );
}
