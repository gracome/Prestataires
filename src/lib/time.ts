import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Timezone helpers.
 *
 * Instants live in UTC in the database. Opening rules live as minutes from
 * local midnight in the provider IANA timezone. Everything that bridges the
 * two goes through this module so the conversion is written once.
 */

/** A calendar date in the provider timezone, as "YYYY-MM-DD". */
export type LocalDate = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDate(value: string): value is LocalDate {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

export function assertLocalDate(value: string): LocalDate {
  if (!isLocalDate(value)) {
    throw new Error(`Expected a YYYY-MM-DD date, received "${value}"`);
  }
  return value;
}

/** The calendar date an instant falls on, in the given timezone. */
export function toLocalDate(instant: Date, timezone: string): LocalDate {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd") as LocalDate;
}

/** Day of week of a local calendar date. 0 = Sunday, per JS convention. */
export function localDayOfWeek(date: LocalDate, timezone: string): number {
  const instant = localDateTimeToUtc(date, 12 * 60, timezone);
  return Number(formatInTimeZone(instant, timezone, "i")) % 7;
}

/**
 * Turn a local calendar date plus minutes-from-midnight into a UTC instant.
 *
 * Minute offsets past 1440 roll into the following day, which is how a
 * closing time after midnight is expressed.
 */
export function localDateTimeToUtc(
  date: LocalDate,
  minutesFromMidnight: number,
  timezone: string,
): Date {
  const dayOffset = Math.floor(minutesFromMidnight / (24 * 60));
  const withinDay = minutesFromMidnight - dayOffset * 24 * 60;

  const base = addDays(date, dayOffset);
  const hours = Math.floor(withinDay / 60);
  const minutes = withinDay % 60;

  const wallClock = `${base}T${pad(hours)}:${pad(minutes)}:00`;
  return fromZonedTime(wallClock, timezone);
}

/** Minutes elapsed since local midnight for an instant. */
export function minutesFromLocalMidnight(
  instant: Date,
  timezone: string,
): number {
  const hours = Number(formatInTimeZone(instant, timezone, "H"));
  const minutes = Number(formatInTimeZone(instant, timezone, "m"));
  return hours * 60 + minutes;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return [
    shifted.getUTCFullYear(),
    pad(shifted.getUTCMonth() + 1),
    pad(shifted.getUTCDate()),
  ].join("-") as LocalDate;
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / 86_400_000);
}

function utcMidnight(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Inclusive list of local dates from `from` to `to`. */
export function eachLocalDate(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i += 1) out.push(addDays(from, i));
  return out;
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

/** Half-open overlap test: [aStart, aEnd) against [bStart, bEnd). */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function formatLocalTime(
  instant: Date,
  timezone: string,
  pattern = "HH:mm",
): string {
  return formatInTimeZone(instant, timezone, pattern);
}

const FR_DAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function dayLabelFr(dayOfWeek: number): string {
  return FR_DAYS[((dayOfWeek % 7) + 7) % 7];
}

/** "lundi 15 janvier 2025", built without relying on ICU locale data. */
export function formatLongDateFr(instant: Date, timezone: string): string {
  const dow = Number(formatInTimeZone(instant, timezone, "i")) % 7;
  const day = Number(formatInTimeZone(instant, timezone, "d"));
  const month = Number(formatInTimeZone(instant, timezone, "M")) - 1;
  const year = formatInTimeZone(instant, timezone, "yyyy");
  return `${FR_DAYS[dow]} ${day} ${FR_MONTHS[month]} ${year}`;
}

export function formatLocalDateLabelFr(date: LocalDate, timezone: string): string {
  return formatLongDateFr(localDateTimeToUtc(date, 12 * 60, timezone), timezone);
}

/** "1 h 30" / "45 min" for a duration in minutes. */
export function formatDurationFr(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${pad(rest)}`;
}

/** Minutes-from-midnight to "09:00". */
export function formatMinuteOfDay(minute: number): string {
  const normalised = ((minute % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalised / 60))}:${pad(normalised % 60)}`;
}

/** "09:00" to minutes-from-midnight. */
export function parseMinuteOfDay(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`Expected HH:mm, received "${value}"`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) {
    throw new Error(`Invalid time "${value}"`);
  }
  return hours * 60 + minutes;
}

export function zonedNow(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
