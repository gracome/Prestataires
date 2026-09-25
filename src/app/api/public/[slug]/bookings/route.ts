import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BookingError, createBooking } from "@/lib/booking/reservation";
import { AvailabilityError } from "@/lib/booking/availability-service";
import { createBookingSchema, fieldErrors } from "@/lib/validation";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  dispatchInBackground,
  notifyAppointment,
} from "@/lib/notifications/dispatch";
import { upsertAppointmentEvent } from "@/lib/google/calendar";
import { RESERVED_SLUGS } from "@/lib/providers/public-site";

/**
 * POST /api/public/{slug}/bookings
 *
 * Creates a booking. With no deposit the appointment is confirmed straight
 * away; with a deposit it is held and the customer is sent to the payment
 * page. Emails and the calendar event are dispatched after the response, so a
 * slow mail server never costs the customer their slot.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return NextResponse.json({ error: "Prestataire introuvable." }, { status: 404 });
  }

  const ip = clientIp(request.headers);
  const limit = rateLimit(
    `booking:${ip}`,
    LIMITS.booking.limit,
    LIMITS.booking.windowSeconds,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "Trop de réservations depuis cet appareil. Réessayez plus tard ou contactez la prestataire.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Merci de vérifier les informations saisies.", errors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const provider = await prisma.provider.findFirst({
    where: { slug: slug.toLowerCase(), status: "ACTIVE" },
    select: { id: true, slug: true, bookingSettings: { select: { requireCustomerEmail: true } } },
  });

  if (!provider) {
    return NextResponse.json({ error: "Prestataire introuvable." }, { status: 404 });
  }

  if (provider.bookingSettings?.requireCustomerEmail && !parsed.data.customerEmail) {
    return NextResponse.json(
      {
        error: "Merci de vérifier les informations saisies.",
        errors: { customerEmail: "L'adresse email est requise pour recevoir la confirmation." },
      },
      { status: 400 },
    );
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json(
      { error: "Créneau invalide.", errors: { startsAt: "Créneau invalide." } },
      { status: 400 },
    );
  }

  try {
    const { appointment, requiresDeposit } = await createBooking({
      providerId: provider.id,
      serviceId: parsed.data.serviceId,
      startsAt,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail ?? null,
      customerNote: parsed.data.customerNote ?? null,
    });

    dispatchInBackground(
      async () => {
        await notifyAppointment("provider.booking.created", appointment.id);
        if (requiresDeposit) {
          await notifyAppointment("customer.booking.awaiting_payment", appointment.id);
        } else {
          await notifyAppointment("customer.booking.confirmed", appointment.id);
          await upsertAppointmentEvent(appointment.id);
        }
      },
      `booking ${appointment.reference}`,
    );

    return NextResponse.json(
      {
        reference: appointment.reference,
        status: appointment.status,
        requiresDeposit,
        depositAmount: appointment.depositAmount,
        // The token is the customer's only key to their booking, so it is
        // returned once here and never listed anywhere else.
        redirectTo: `/reservation/${appointment.accessToken}`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { error: "Cette prestation n'est plus réservable.", code: error.code },
        { status: 400 },
      );
    }
    throw error;
  }
}
