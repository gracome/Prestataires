import type { AppointmentStatus, Review } from "@prisma/client";

/**
 * Customer reviews.
 *
 * A review can only be left through a booking's private link, once the
 * appointment has actually happened, and once per appointment. That is the
 * whole of the anti-abuse model: there is no open form on the public site, so
 * there is nothing for a stranger, a competitor or a bot to fill in.
 */

/** Statuses after which the appointment can be said to have taken place. */
const DONE: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>(["COMPLETED"]);

export function canLeaveReview(
  booking: {
    status: AppointmentStatus;
    serviceEndsAt: Date;
    review: Pick<Review, "id"> | null;
  },
  now: Date = new Date(),
): boolean {
  if (booking.review) return false;
  if (DONE.has(booking.status)) return true;
  // The closing job runs every few minutes; a customer who opens her link
  // right after leaving the salon should not be told to come back later.
  return booking.status === "CONFIRMED" && booking.serviceEndsAt.getTime() <= now.getTime();
}

/**
 * "Aïcha Koffi" → "Aïcha K.". A review is public; her full name is not
 * something she agreed to publish by booking a braid.
 */
export function publicReviewerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  const [first, ...rest] = parts;
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

export type ReviewSummary = { count: number; average: number };

/** Average to one decimal, over the reviews actually shown. */
export function summarizeReviews(reviews: Array<Pick<Review, "rating">>): ReviewSummary {
  if (reviews.length === 0) return { count: 0, average: 0 };
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return { count: reviews.length, average: Math.round((total / reviews.length) * 10) / 10 };
}
