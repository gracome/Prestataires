import { cache } from "react";
import type {
  Appointment,
  BookingSettings,
  PaymentInstruction,
  PaymentProof,
  Provider,
  Service,
  Theme,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { releaseExpiredAppointments } from "./expiration";

/**
 * The customer's view of their own booking, reached with the opaque token
 * that was issued when the booking was created. No account, no listing:
 * holding the token is the authorisation, and the token is only ever sent to
 * the customer who made the booking.
 */

export type CustomerBooking = Appointment & {
  provider: Provider & {
    theme: Theme | null;
    bookingSettings: BookingSettings | null;
    paymentInstructions: PaymentInstruction[];
  };
  service: Service;
  paymentProofs: PaymentProof[];
};

export const getBookingByToken = cache(
  async (token: string): Promise<CustomerBooking | null> => {
    if (!token || token.length < 20) return null;

    const appointment = await prisma.appointment.findUnique({
      where: { accessToken: token },
      include: {
        provider: {
          include: {
            theme: true,
            bookingSettings: true,
            paymentInstructions: {
              where: { active: true },
              orderBy: { position: "asc" },
            },
          },
        },
        service: true,
        paymentProofs: { orderBy: { submittedAt: "desc" } },
      },
    });

    if (!appointment) return null;

    // Expire the booking on read rather than showing a payment form for a hold
    // that has already lapsed.
    if (
      appointment.expiresAt &&
      appointment.expiresAt <= new Date() &&
      ["TEMPORARILY_RESERVED", "AWAITING_PAYMENT", "PAYMENT_PROOF_SUBMITTED"].includes(
        appointment.status,
      )
    ) {
      await releaseExpiredAppointments({
        providerId: appointment.providerId,
      });

      return prisma.appointment.findUnique({
        where: { accessToken: token },
        include: {
          provider: {
            include: {
              theme: true,
              bookingSettings: true,
              paymentInstructions: {
                where: { active: true },
                orderBy: { position: "asc" },
              },
            },
          },
          service: true,
          paymentProofs: { orderBy: { submittedAt: "desc" } },
        },
      });
    }

    return appointment;
  },
);

/** Whether the customer may still cancel, per the provider's notice period. */
export function canCustomerCancel(
  booking: CustomerBooking,
  now = new Date(),
): boolean {
  if (booking.provider.bookingSettings?.allowCustomerCancellation === false) {
    return false;
  }
  if (!["CONFIRMED", "TEMPORARILY_RESERVED", "AWAITING_PAYMENT", "PAYMENT_PROOF_SUBMITTED"].includes(booking.status)) {
    return false;
  }

  const noticeHours = booking.provider.bookingSettings?.cancellationNoticeHours ?? 24;
  const cutoff = new Date(booking.startsAt.getTime() - noticeHours * 3_600_000);

  // A booking that is not yet confirmed can always be dropped: nothing has
  // been committed on either side.
  if (booking.status !== "CONFIRMED") return true;

  return now <= cutoff;
}

export function canSubmitProof(
  booking: CustomerBooking,
  now = new Date(),
): boolean {
  if (booking.validationMethod !== "MANUAL_PAYMENT") return false;
  if (!["TEMPORARILY_RESERVED", "AWAITING_PAYMENT"].includes(booking.status)) {
    return false;
  }
  return !booking.expiresAt || booking.expiresAt > now;
}
