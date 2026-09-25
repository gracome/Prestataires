import type { UserRole } from "@prisma/client";

/**
 * Who may open which part of the workspace.
 *
 * A provider can give an account to someone who works with her. That person
 * runs the diary: appointments, the calendar, the service list, opening hours,
 * the gallery, quote requests, and the day's till. She does not see turnover,
 * average basket, bank details or the reports, which are the owner's business
 * and not her employee's.
 *
 * The list lives here rather than in each page so the menu and the guard can
 * never disagree: the menu is built from the same table that refuses the URL.
 */

export type Section =
  | "home"
  | "reports"
  | "bookings"
  | "till"
  | "calendar"
  | "services"
  | "hours"
  | "gallery"
  | "quotes"
  | "site"
  | "payment"
  | "notifications"
  | "settings";

/** What an employee account may reach. Everything else is the owner's. */
const STAFF_SECTIONS: ReadonlySet<Section> = new Set<Section>([
  "bookings",
  // The till is money, but it is also the desk: an employee who serves a
  // walk-in has to be able to record it there and then. She sees the day she
  // is working, not the month's turnover, which stays on the reports.
  "till",
  "calendar",
  "services",
  "hours",
  "gallery",
  "quotes",
]);

export function canAccess(role: UserRole, section: Section): boolean {
  if (role === "PROVIDER") return true;
  if (role === "STAFF") return STAFF_SECTIONS.has(section);
  // A platform administrator has no provider account, so nothing in here is
  // theirs to open. Support goes through a recorded session instead.
  return false;
}

/**
 * Where an account lands when it signs in, or when it asks for a page it may
 * not have.
 *
 * An employee cannot start on the dashboard home, because that screen is the
 * turnover. Her day starts on the bookings list, which is what she came for.
 */
export function homeFor(role: UserRole): string {
  if (role === "STAFF") return "/dashboard/reservations";
  if (role === "PLATFORM_ADMIN") return "/admin";
  return "/dashboard";
}

/** How many accounts one provider may hold, herself included. */
export const MAX_ACCOUNTS_PER_PROVIDER = 3;

export function roleLabelFr(role: UserRole): string {
  if (role === "PROVIDER") return "Responsable";
  if (role === "STAFF") return "Équipe";
  return "Plateforme";
}
