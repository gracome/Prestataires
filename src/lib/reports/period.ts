import { addDays, daysBetween, isLocalDate, toLocalDate, type LocalDate } from "@/lib/time";

/**
 * Reporting periods (cahier des charges section 19, "statistiques simples",
 * extended to real reports).
 *
 * Every period is a pair of local calendar dates in the provider timezone,
 * inclusive on both ends. Working in local dates rather than instants is what
 * makes "ce mois-ci" mean the same thing to her as to the report.
 */

export type PeriodPreset =
  | "7j"
  | "30j"
  | "mois"
  | "mois-dernier"
  | "90j"
  | "annee"
  | "personnalise";

export type Period = {
  preset: PeriodPreset;
  from: LocalDate;
  to: LocalDate;
  label: string;
  /** Number of days covered, both ends included. */
  days: number;
};

export const PERIOD_PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "mois", label: "Ce mois-ci" },
  { value: "mois-dernier", label: "Mois dernier" },
  { value: "90j", label: "90 derniers jours" },
  { value: "annee", label: "Cette année" },
];

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function firstOfMonth(date: LocalDate): LocalDate {
  return `${date.slice(0, 8)}01` as LocalDate;
}

function lastOfMonth(date: LocalDate): LocalDate {
  const [year, month] = date.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, month, 0));
  return [
    last.getUTCFullYear(),
    String(last.getUTCMonth() + 1).padStart(2, "0"),
    String(last.getUTCDate()).padStart(2, "0"),
  ].join("-") as LocalDate;
}

function monthLabel(date: LocalDate): string {
  const month = Number(date.slice(5, 7)) - 1;
  return `${MONTHS[month]} ${date.slice(0, 4)}`;
}

/**
 * Turn a query string into a period. Anything unrecognised falls back to the
 * last 30 days rather than erroring: a report is a read-only view and a bad
 * link should still show something useful.
 */
export function resolvePeriod(
  params: { periode?: string; du?: string; au?: string },
  timezone: string,
  now = new Date(),
): Period {
  const today = toLocalDate(now, timezone);
  const preset = (params.periode ?? "30j") as PeriodPreset;

  if (preset === "personnalise") {
    const from = params.du && isLocalDate(params.du) ? params.du : addDays(today, -29);
    const to = params.au && isLocalDate(params.au) ? params.au : today;

    // A reversed range is a slip, not an error: swap it.
    const [start, end] = daysBetween(from, to) < 0 ? [to, from] : [from, to];

    return {
      preset: "personnalise",
      from: start,
      to: end,
      label: `Du ${humanDate(start)} au ${humanDate(end)}`,
      days: daysBetween(start, end) + 1,
    };
  }

  switch (preset) {
    case "7j":
      return build("7j", addDays(today, -6), today, "7 derniers jours");
    case "mois": {
      const from = firstOfMonth(today);
      return build("mois", from, today, monthLabel(today));
    }
    case "mois-dernier": {
      const anchor = addDays(firstOfMonth(today), -1);
      return build(
        "mois-dernier",
        firstOfMonth(anchor),
        lastOfMonth(anchor),
        monthLabel(anchor),
      );
    }
    case "90j":
      return build("90j", addDays(today, -89), today, "90 derniers jours");
    case "annee":
      return build("annee", `${today.slice(0, 4)}-01-01` as LocalDate, today, `Année ${today.slice(0, 4)}`);
    case "30j":
    default:
      return build("30j", addDays(today, -29), today, "30 derniers jours");
  }
}

function build(
  preset: PeriodPreset,
  from: LocalDate,
  to: LocalDate,
  label: string,
): Period {
  return { preset, from, to, label, days: daysBetween(from, to) + 1 };
}

/**
 * The period to compare against: the same number of days, ending the day
 * before this one starts.
 *
 * A calendar month compares against the previous calendar month rather than a
 * fixed count, otherwise February would always look worse than January.
 */
export function previousPeriod(period: Period): Period {
  if (period.preset === "mois" || period.preset === "mois-dernier") {
    const anchor = addDays(period.from, -1);
    const from = firstOfMonth(anchor);
    const to = lastOfMonth(anchor);

    // A month in progress compares against the same slice of the month before,
    // so a report run on the 10th is not measured against a full month.
    const elapsed = daysBetween(period.from, period.to);
    const cappedTo = daysBetween(from, to) <= elapsed ? to : addDays(from, elapsed);

    return build(period.preset, from, cappedTo, monthLabel(anchor));
  }

  const to = addDays(period.from, -1);
  const from = addDays(to, -(period.days - 1));
  return build(period.preset, from, to, `${period.days} jours précédents`);
}

export function humanDate(date: LocalDate): string {
  const day = Number(date.slice(8, 10));
  const month = Number(date.slice(5, 7)) - 1;
  return `${day} ${MONTHS[month]} ${date.slice(0, 4)}`;
}

/** Query string for a period, used by the filter links and the export button. */
export function periodQuery(period: Period): string {
  if (period.preset !== "personnalise") return `periode=${period.preset}`;
  return `periode=personnalise&du=${period.from}&au=${period.to}`;
}
