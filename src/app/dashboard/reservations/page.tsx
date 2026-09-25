import { Suspense } from "react";
import Link from "next/link";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { releaseExpiredAppointments } from "@/lib/booking/expiration";
import { statusLabelFr } from "@/lib/booking/state-machine";
import { formatMoney } from "@/lib/money";
import { formatLocalTime, formatLongDateFr } from "@/lib/time";
import {
  EmptyState,
  PageHeader,
  SkeletonTable,
  StatusPill,
} from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const FILTERS: Array<{ value: string; label: string; statuses?: AppointmentStatus[] }> = [
  { value: "a-verifier", label: "À vérifier", statuses: ["PAYMENT_PROOF_SUBMITTED"] },
  {
    value: "en-attente",
    label: "En attente",
    statuses: ["TEMPORARILY_RESERVED", "AWAITING_PAYMENT"],
  },
  { value: "confirmes", label: "Confirmés", statuses: ["CONFIRMED"] },
  { value: "a-venir", label: "À venir" },
  { value: "passes", label: "Passés" },
  { value: "tous", label: "Tous" },
];

type Query = { filtre?: string; statut?: string; page?: string };

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { provider } = await requireSection("bookings");
  const query = await searchParams;

  return (
    <>
      <PageHeader title="Réservations" />

      <FilterBar active={activeFilter(query)} />

      <Suspense key={JSON.stringify(query)} fallback={<SkeletonTable rows={6} />}>
        <ReservationsContent providerId={provider.id} query={query} />
      </Suspense>
    </>
  );
}

/** The filter chips need no data, so they paint with the title. */
function activeFilter(query: Query): string {
  return (
    FILTERS.find((f) => f.value === query.filtre)?.value ??
    (query.statut ? "statut" : "a-venir")
  );
}

async function ReservationsContent({
  providerId,
  query,
}: {
  providerId: string;
  query: Query;
}) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });
  await releaseExpiredAppointments({ providerId: provider.id });

  // `filtre` is read through activeFilter, which the shell also uses so both
  // sides agree on which chip is selected.
  const { statut, page: pageParam } = query;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const tz = provider.timezone;
  const now = new Date();

  const active = activeFilter(query);

  const where: Prisma.AppointmentWhereInput = { providerId: provider.id };

  if (statut && isStatus(statut)) {
    where.status = statut;
  } else if (active === "a-venir") {
    where.startsAt = { gte: now };
    where.status = {
      in: [
        "TEMPORARILY_RESERVED",
        "AWAITING_PAYMENT",
        "PAYMENT_PROOF_SUBMITTED",
        "CONFIRMED",
      ],
    };
  } else if (active === "passes") {
    where.startsAt = { lt: now };
  } else {
    const filter = FILTERS.find((f) => f.value === active);
    if (filter?.statuses) where.status = { in: filter.statuses };
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { service: true, paymentProofs: { take: 1, orderBy: { submittedAt: "desc" } } },
      orderBy: active === "passes" ? { startsAt: "desc" } : { startsAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.appointment.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {statut && isStatus(statut) ? (
        <p style={{ fontSize: ".88rem", color: "var(--admin-muted)", marginBottom: "1rem" }}>
          Filtré sur le statut : {statusLabelFr(statut)}.{" "}
          <Link href="/dashboard/reservations">Réinitialiser</Link>
        </p>
      ) : null}

      {appointments.length === 0 ? (
        <EmptyState
          title="Aucune réservation dans cette vue"
          description="Changez de filtre ou attendez les prochaines demandes."
        />
      ) : (
        <div className="card table-scroll" style={{ padding: 0 }}>
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Cliente</th>
                <th scope="col">Prestation</th>
                <th scope="col">Montant</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link
                      href={`/dashboard/reservations/${appointment.id}`}
                      style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
                    >
                      {formatLongDateFr(appointment.startsAt, tz)}
                    </Link>
                    <span style={{ display: "block", color: "var(--admin-muted)", fontSize: ".82rem" }}>
                      {formatLocalTime(appointment.startsAt, tz)} –{" "}
                      {formatLocalTime(appointment.serviceEndsAt, tz)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{appointment.customerName}</span>
                    <span style={{ display: "block", color: "var(--admin-muted)", fontSize: ".82rem" }}>
                      {appointment.customerPhone}
                    </span>
                  </td>
                  <td>{appointment.service.name}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatMoney(appointment.totalAmount, appointment.currency, provider.locale)}
                    {appointment.depositAmount > 0 ? (
                      <span style={{ display: "block", color: "var(--admin-muted)", fontSize: ".82rem" }}>
                        acompte{" "}
                        {formatMoney(appointment.depositAmount, appointment.currency, provider.locale)}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <StatusPill status={appointment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav
          aria-label="Pagination"
          style={{ display: "flex", gap: ".5rem", marginTop: "1.25rem", alignItems: "center" }}
        >
          {page > 1 ? (
            <Link
              href={`/dashboard/reservations?filtre=${active}&page=${page - 1}`}
              className="btn btn-secondary"
              style={{ padding: ".45rem .9rem", minHeight: 38, fontSize: ".85rem" }}
            >
              Précédent
            </Link>
          ) : null}
          <span style={{ fontSize: ".85rem", color: "var(--admin-muted)" }}>
            Page {page} sur {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/dashboard/reservations?filtre=${active}&page=${page + 1}`}
              className="btn btn-secondary"
              style={{ padding: ".45rem .9rem", minHeight: 38, fontSize: ".85rem" }}
            >
              Suivant
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

function FilterBar({ active }: { active: string }) {
  return (
    <nav
      aria-label="Filtres"
      style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}
    >
      {FILTERS.map((filter) => {
        const selected = active === filter.value;
        return (
          <Link
            key={filter.value}
            href={`/dashboard/reservations?filtre=${filter.value}`}
            aria-current={selected ? "page" : undefined}
            style={{
              padding: ".4rem .85rem",
              borderRadius: 999,
              fontSize: ".85rem",
              fontWeight: 600,
              textDecoration: "none",
              border: `1px solid ${selected ? "var(--admin-accent)" : "var(--admin-border)"}`,
              background: selected ? "var(--admin-accent)" : "var(--admin-surface)",
              color: selected ? "var(--admin-accent-fg)" : "var(--admin-text)",
            }}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}

const STATUSES: AppointmentStatus[] = [
  "TEMPORARILY_RESERVED",
  "AWAITING_PAYMENT",
  "PAYMENT_PROOF_SUBMITTED",
  "CONFIRMED",
  "PAYMENT_REJECTED",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "NO_SHOW",
];

function isStatus(value: string): value is AppointmentStatus {
  return (STATUSES as string[]).includes(value);
}
