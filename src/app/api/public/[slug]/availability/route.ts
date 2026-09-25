import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  AvailabilityError,
  getAvailability,
} from "@/lib/booking/availability-service";
import { availabilityQuerySchema, fieldErrors } from "@/lib/validation";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { addDays, daysBetween, formatLocalTime } from "@/lib/time";
import { RESERVED_SLUGS } from "@/lib/providers/public-site";

/**
 * GET /api/public/{slug}/availability?serviceId=&from=&to=
 *
 * Free slots for one service over a date range. Never cached: an answer that
 * is one minute old can send a customer to a slot somebody else just took.
 */

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 31;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return NextResponse.json({ error: "Prestataire introuvable." }, { status: 404 });
  }

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

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    serviceId: url.searchParams.get("serviceId") ?? "",
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requête invalide.", errors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const span = daysBetween(parsed.data.from, parsed.data.to);
  if (span < 0) {
    return NextResponse.json(
      { error: "La date de fin doit suivre la date de début." },
      { status: 400 },
    );
  }

  // Clamp rather than reject: a wide range is a client bug, not an attack, and
  // returning the first month is more useful than an error.
  const to =
    span > MAX_RANGE_DAYS - 1
      ? addDays(parsed.data.from, MAX_RANGE_DAYS - 1)
      : parsed.data.to;

  const provider = await prisma.provider.findFirst({
    where: { slug: slug.toLowerCase(), status: "ACTIVE" },
    select: { id: true },
  });

  if (!provider) {
    return NextResponse.json({ error: "Prestataire introuvable." }, { status: 404 });
  }

  try {
    const { timezone, days } = await getAvailability(
      provider.id,
      parsed.data.serviceId,
      { from: parsed.data.from, to },
    );

    return NextResponse.json(
      {
        timezone,
        days: days.map((day) => ({
          date: day.date,
          isOpen: day.isOpen,
          slots: day.slots.map((slot) => ({
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
      const status = error.code === "PROVIDER_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: messageFor(error) }, { status });
    }
    throw error;
  }
}

function messageFor(error: AvailabilityError): string {
  switch (error.code) {
    case "PROVIDER_NOT_FOUND":
      return "Prestataire introuvable.";
    case "SERVICE_NOT_FOUND":
      return "Cette prestation n'est plus disponible.";
    case "QUOTE_ONLY":
      return "Cette prestation se réserve sur devis.";
    default:
      return "La réservation en ligne est momentanément fermée.";
  }
}
