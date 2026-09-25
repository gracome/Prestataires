import { Suspense } from "react";
import Link from "next/link";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { releaseExpiredAppointments } from "@/lib/booking/expiration";
import { BLOCKING_STATUSES, statusTone } from "@/lib/booking/state-machine";
import {
  addDays,
  dayLabelFr,
  formatLocalTime,
  formatMinuteOfDay,
  isLocalDate,
  localDateTimeToUtc,
  localDayOfWeek,
  toLocalDate,
  type LocalDate,
} from "@/lib/time";
import { formatMoney } from "@/lib/money";
import { PageHeader, SkeletonList } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

/**
 * Week planner (cahier des charges section 19).
 *
 * A vertical day-by-day list rather than a time grid: on a phone a grid of
 * seven columns is unreadable, and a provider mostly wants to know what is
 * coming, in order.
 */
export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const { provider } = await requireSection("calendar");
  const { semaine } = await searchParams;

  // The week arithmetic needs no database, so the header and the
  // navigation arrows paint immediately.
  const tz = provider.timezone;
  const anchor = semaine && isLocalDate(semaine) ? semaine : toLocalDate(new Date(), tz);
  const weekStart = startOfWeek(anchor, tz);

  return (
    <>
      <PageHeader
        title="Calendrier"
        description={`Semaine du ${dayNumber(weekStart)} au ${dayNumber(addDays(weekStart, 6))}`}
        action={<WeekNav weekStart={weekStart} />}
      />

      <Suspense key={weekStart} fallback={<SkeletonList count={7} label="Chargement de la semaine…" />}>
        <CalendrierContent providerId={provider.id} weekStart={weekStart} />
      </Suspense>
    </>
  );
}

function WeekNav({ weekStart }: { weekStart: LocalDate }) {
  return (
    <div style={{ display: "flex", gap: ".4rem" }}>
      <Link
        href={`/dashboard/calendrier?semaine=${addDays(weekStart, -7)}`}
        className="btn btn-secondary"
        style={navButton}
      >
        <span aria-hidden="true">‹</span>
        <span className="visually-hidden">Semaine précédente</span>
      </Link>
      <Link href="/dashboard/calendrier" className="btn btn-secondary" style={{ ...navButton, fontSize: ".85rem" }}>
        Aujourd&apos;hui
      </Link>
      <Link
        href={`/dashboard/calendrier?semaine=${addDays(weekStart, 7)}`}
        className="btn btn-secondary"
        style={navButton}
      >
        <span aria-hidden="true">›</span>
        <span className="visually-hidden">Semaine suivante</span>
      </Link>
    </div>
  );
}

async function CalendrierContent({
  providerId,
  weekStart,
}: {
  providerId: string;
  weekStart: LocalDate;
}) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });
  await releaseExpiredAppointments({ providerId: provider.id });

  const tz = provider.timezone;
  const now = new Date();

  const weekEnd = addDays(weekStart, 6);

  const from = localDateTimeToUtc(weekStart, 0, tz);
  const to = localDateTimeToUtc(addDays(weekEnd, 1), 0, tz);

  const [appointments, blocks, workingHours] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        status: { in: [...BLOCKING_STATUSES] },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      include: { service: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.timeBlock.findMany({
      where: { providerId: provider.id, startsAt: { lt: to }, endsAt: { gt: from } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.workingHours.findMany({ where: { providerId: provider.id } }),
  ]);

  const hoursByDay = new Map(workingHours.map((wh) => [wh.dayOfWeek, wh]));
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const today = toLocalDate(now, tz);

  return (
    <div style={{ display: "grid", gap: ".75rem" }}>
        {days.map((date) => {
          const dayStart = localDateTimeToUtc(date, 0, tz);
          const dayEnd = localDateTimeToUtc(addDays(date, 1), 0, tz);

          const dayAppointments = appointments.filter(
            (a) => a.startsAt < dayEnd && a.endsAt > dayStart,
          );
          const dayBlocks = blocks.filter(
            (b) => b.startsAt < dayEnd && b.endsAt > dayStart,
          );

          const rule = hoursByDay.get(localDayOfWeek(date, tz));
          const isToday = date === today;

          return (
            <section
              key={date}
              className="card"
              style={{
                borderColor: isToday ? "var(--admin-accent)" : undefined,
                borderWidth: isToday ? 2 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: ".75rem",
                  flexWrap: "wrap",
                  marginBottom: dayAppointments.length || dayBlocks.length ? ".9rem" : 0,
                }}
              >
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, textTransform: "capitalize" }}>
                  {dayLabelFr(localDayOfWeek(date, tz))} {Number(date.slice(8, 10))}
                  {isToday ? (
                    <span className="pill pill-action" style={{ marginLeft: ".5rem" }}>
                      Aujourd&apos;hui
                    </span>
                  ) : null}
                </h2>
                <span style={{ fontSize: ".82rem", color: "var(--admin-muted)" }}>
                  {rule?.active
                    ? `${formatMinuteOfDay(rule.openMinute)} – ${formatMinuteOfDay(rule.closeMinute)}`
                    : "Fermé"}
                </span>
              </div>

              {dayAppointments.length === 0 && dayBlocks.length === 0 ? (
                <p style={{ margin: 0, fontSize: ".85rem", color: "var(--admin-muted)" }}>
                  {rule?.active ? "Aucun rendez-vous." : "Jour de fermeture."}
                </p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".45rem" }}>
                  {dayBlocks.map((block) => (
                    <li
                      key={block.id}
                      style={{
                        display: "flex",
                        gap: ".75rem",
                        alignItems: "center",
                        padding: ".5rem .7rem",
                        borderRadius: 10,
                        background: "var(--admin-subtle)",
                        fontSize: ".85rem",
                        color: "var(--admin-muted)",
                      }}
                    >
                      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, flexShrink: 0 }}>
                        {block.allDay
                          ? "Journée"
                          : `${formatLocalTime(block.startsAt, tz)}–${formatLocalTime(block.endsAt, tz)}`}
                      </span>
                      <span>
                        {block.type === "EXTERNAL_CALENDAR" ? "Google Calendar" : "Indisponible"}
                        {block.reason ? ` · ${block.reason}` : ""}
                      </span>
                    </li>
                  ))}

                  {dayAppointments.map((appointment) => (
                    <li key={appointment.id}>
                      <Link
                        href={`/dashboard/reservations/${appointment.id}`}
                        style={{
                          display: "flex",
                          gap: ".75rem",
                          alignItems: "center",
                          padding: ".6rem .7rem",
                          borderRadius: 10,
                          background: "var(--admin-subtle)",
                          textDecoration: "none",
                          color: "inherit",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            fontSize: ".9rem",
                            flexShrink: 0,
                          }}
                        >
                          {formatLocalTime(appointment.startsAt, tz)}
                        </span>
                        <span style={{ flex: "1 1 140px", minWidth: 0, fontSize: ".9rem" }}>
                          {appointment.customerName}
                          <span style={{ display: "block", fontSize: ".8rem", color: "var(--admin-muted)" }}>
                            {appointment.service.name} ·{" "}
                            {formatMoney(appointment.totalAmount, appointment.currency, provider.locale)}
                          </span>
                        </span>
                        <span className={`pill pill-${statusTone(appointment.status)}`}>
                          {shortStatus(appointment.status)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
      })}
    </div>
  );
}

/** Monday-anchored week start for a local date. */
function startOfWeek(date: LocalDate, timezone: string): LocalDate {
  const dow = localDayOfWeek(date, timezone);
  // Sunday (0) belongs to the week that started the previous Monday.
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(date, offset);
}

const MONTHS_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function dayNumber(date: LocalDate): string {
  const day = Number(date.slice(8, 10));
  const month = Number(date.slice(5, 7)) - 1;
  return `${day} ${MONTHS_SHORT[month]}`;
}

function shortStatus(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmé";
    case "PAYMENT_PROOF_SUBMITTED":
      return "À vérifier";
    case "AWAITING_PAYMENT":
    case "TEMPORARILY_RESERVED":
      return "En attente";
    case "COMPLETED":
      return "Terminé";
    case "NO_SHOW":
      return "Absente";
    default:
      return status;
  }
}

const navButton: React.CSSProperties = {
  padding: ".4rem .8rem",
  minHeight: 38,
  fontSize: "1rem",
  lineHeight: 1,
};
