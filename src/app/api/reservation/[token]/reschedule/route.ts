import { NextResponse } from "next/server";
import {
  BookingError,
  rescheduleAppointment,
} from "@/lib/booking/reservation";
import {
  canCustomerReschedule,
  getBookingByToken,
} from "@/lib/booking/customer-view";
import { AvailabilityError } from "@/lib/booking/availability-service";
import { rescheduleBookingSchema } from "@/lib/validation";
import {
  dispatchInBackground,
  notifyAppointment,
} from "@/lib/notifications/dispatch";
import { upsertAppointmentEvent } from "@/lib/google/calendar";

/**
 * POST /api/reservation/{token}/reschedule  { startsAt }
 *
 * The customer moves her confirmed appointment to another free time. Same
 * rules as cancelling: the provider's notice period decides whether it can
 * still be done online.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const booking = await getBookingByToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  if (!canCustomerReschedule(booking)) {
    const hours = booking.provider.bookingSettings?.cancellationNoticeHours ?? 24;
    return NextResponse.json(
      {
        error: `Ce rendez-vous ne peut plus être déplacé en ligne (préavis de ${hours} h). Contactez directement ${booking.provider.businessName}.`,
      },
      { status: 409 },
    );
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    // Handled by the schema below.
  }

  const parsed = rescheduleBookingSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Choisissez un nouveau créneau." }, { status: 400 });
  }

  let previousStartsAt: Date;
  try {
    const result = await rescheduleAppointment({
      appointmentId: booking.id,
      startsAt: new Date(parsed.data.startsAt),
    });
    previousStartsAt = result.previousStartsAt;
  } catch (error) {
    if (error instanceof BookingError) {
      const message =
        error.code === "SLOT_TAKEN"
          ? "Ce créneau vient d'être pris. Choisissez-en un autre."
          : error.code === "SLOT_INVALID"
            ? "C'est déjà l'heure de votre rendez-vous."
            : "Ce rendez-vous ne peut pas être déplacé.";
      return NextResponse.json({ error: message, code: error.code }, { status: error.status });
    }
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { error: "Ce rendez-vous ne peut pas être déplacé en ligne." },
        { status: 409 },
      );
    }
    throw error;
  }

  // Keyed on the new time, so a second move sends its own messages.
  const discriminator = new Date(parsed.data.startsAt).toISOString();

  dispatchInBackground(
    async () => {
      if (booking.googleEventId) await upsertAppointmentEvent(booking.id);
      await notifyAppointment("customer.booking.rescheduled", booking.id, {
        discriminator,
        previousStartsAt,
      });
      await notifyAppointment("provider.booking.rescheduled", booking.id, {
        discriminator,
        previousStartsAt,
      });
    },
    `reschedule ${booking.reference}`,
  );

  return NextResponse.json({ status: "CONFIRMED" });
}
