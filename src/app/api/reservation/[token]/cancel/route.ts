import { NextResponse } from "next/server";
import { BookingError, cancelAppointment } from "@/lib/booking/reservation";
import { canCustomerCancel, getBookingByToken } from "@/lib/booking/customer-view";
import { cancelBookingSchema } from "@/lib/validation";
import {
  dispatchInBackground,
  notifyAppointment,
} from "@/lib/notifications/dispatch";
import { deleteAppointmentEvent } from "@/lib/google/calendar";

/**
 * POST /api/reservation/{token}/cancel
 *
 * Customer-initiated cancellation. The provider's own notice period decides
 * whether a confirmed booking can still be cancelled this way.
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

  if (!canCustomerCancel(booking)) {
    const hours = booking.provider.bookingSettings?.cancellationNoticeHours ?? 24;
    return NextResponse.json(
      {
        error: `Ce rendez-vous ne peut plus être annulé en ligne (préavis de ${hours} h). Contactez directement ${booking.provider.businessName}.`,
      },
      { status: 409 },
    );
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // An empty body is fine: the reason is optional.
  }

  const parsed = cancelBookingSchema.safeParse(payload ?? {});
  const reason = parsed.success ? parsed.data.reason : undefined;

  const hadCalendarEvent = Boolean(booking.googleEventId);

  try {
    await cancelAppointment({
      appointmentId: booking.id,
      by: "CUSTOMER",
      reason,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    throw error;
  }

  dispatchInBackground(
    async () => {
      if (hadCalendarEvent) await deleteAppointmentEvent(booking.id);
      await notifyAppointment("customer.booking.cancelled", booking.id);
      await notifyAppointment("provider.booking.cancelled", booking.id);
    },
    `cancel ${booking.reference}`,
  );

  return NextResponse.json({ status: "CANCELLED" });
}
