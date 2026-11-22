import { NextResponse } from "next/server";
import {
  canCustomerReschedule,
  getBookingByToken,
} from "@/lib/booking/customer-view";
import {
  AvailabilityError,
  getAvailability,
} from "@/lib/booking/availability-service";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { addDays, daysBetween, formatLocalTime, isLocalDate } from "@/lib/time";

/**
 * GET /api/reservation/{token}/availability?from=&to=
 *
 * Free start times for moving one booking: same service, and the time the
 * booking already holds does not count as busy. Reached with the booking's
 * token, like the rest of the customer's page.
 */

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 31;

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const limit = rateLimit(
    `availability:${clientIp(request.headers)}`,
    LIMITS.availability.limit,
    LIMITS.availability.windowSeconds,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const { token } = await context.params;
  const booking = await getBookingByToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  if (!canCustomerReschedule(booking)) {
    return NextResponse.json(
      { error: "Ce rendez-vous ne peut plus être déplacé en ligne." },
      { status: 409 },
    );
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const toParam = url.searchParams.get("to") ?? "";
  if (!isLocalDate(from) || !isLocalDate(toParam) || daysBetween(from, toParam) < 0) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const to =
    daysBetween(from, toParam) > MAX_RANGE_DAYS - 1
      ? addDays(from, MAX_RANGE_DAYS - 1)
      : toParam;

  try {
    const { timezone, days } = await getAvailability(
      booking.providerId,
      booking.serviceId,
      { from, to },
      new Date(),
      { excludeAppointmentId: booking.id },
    );

    const current = booking.startsAt.getTime();

    return NextResponse.json(
      {
        timezone,
        days: days.map((day) => ({
          date: day.date,
          isOpen: day.isOpen,
          slots: day.slots
            // Her own time is free to her, but choosing it would move nothing.
            .filter((slot) => slot.startsAt.getTime() !== current)
            .map((slot) => ({
              startsAt: slot.startsAt.toISOString(),
              endsAt: slot.serviceEndsAt.toISOString(),
              label: formatLocalTime(slot.startsAt, timezone),
              endLabel: formatLocalTime(slot.serviceEndsAt, timezone),
            })),
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { error: "Les disponibilités ne peuvent pas être chargées pour cette prestation." },
        { status: 400 },
      );
    }
    throw error;
  }
}
