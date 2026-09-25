"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertOwnedBy, requireProviderApi } from "@/lib/auth/guard";
import {
  BookingError,
  cancelAppointment,
  confirmPayment,
  confirmWithoutDeposit,
  markCompleted,
  markNoShow,
  rejectPayment,
} from "@/lib/booking/reservation";
import {
  dispatchInBackground,
  notifyAppointment,
} from "@/lib/notifications/dispatch";
import {
  deleteAppointmentEvent,
  upsertAppointmentEvent,
} from "@/lib/google/calendar";
import {
  fieldErrors,
  providerNoteSchema,
  rejectPaymentSchema,
  type ActionState,
} from "@/lib/validation";
import { InvalidTransitionError } from "@/lib/booking/state-machine";

/**
 * Provider actions on a booking (cahier des charges section 10).
 *
 * Every one of them loads the appointment and checks it belongs to the signed-in
 * provider before touching it, so an id from another tenant is simply not found.
 */

async function ownedAppointment(appointmentId: string) {
  const { user, provider } = await requireProviderApi();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, providerId: true, googleEventId: true, status: true },
  });

  assertOwnedBy(appointment, provider);
  return { user, provider, appointment: appointment! };
}

function refresh(appointmentId: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reservations");
  revalidatePath(`/dashboard/reservations/${appointmentId}`);
  revalidatePath("/dashboard/calendrier");
}

function toActionState(error: unknown, fallback: string): ActionState {
  if (error instanceof BookingError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof InvalidTransitionError) {
    return {
      status: "error",
      message: "Cette action n'est plus possible dans l'état actuel de la réservation.",
    };
  }
  throw new Error(fallback, { cause: error });
}

export async function confirmPaymentAction(
  appointmentId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user, provider } = await ownedAppointment(appointmentId);

  try {
    const updated = await confirmPayment({ appointmentId, userId: user.id });

    await prisma.auditLog.create({
      data: {
        providerId: provider.id,
        userId: user.id,
        action: "appointment.payment.confirmed",
        entityType: "Appointment",
        entityId: appointmentId,
        metadata: { reference: updated.reference },
      },
    });

    dispatchInBackground(
      async () => {
        await upsertAppointmentEvent(appointmentId);
        await notifyAppointment("customer.booking.confirmed", appointmentId);
      },
      `confirm ${updated.reference}`,
    );

    refresh(appointmentId);
    return { status: "success", message: "Paiement confirmé, la cliente a été prévenue." };
  } catch (error) {
    return toActionState(error, "Confirmation impossible");
  }
}

export async function rejectPaymentAction(
  appointmentId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, provider } = await ownedAppointment(appointmentId);

  const parsed = rejectPaymentSchema.safeParse({
    reason: String(formData.get("reason") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Indiquez un motif de refus.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    const updated = await rejectPayment({
      appointmentId,
      userId: user.id,
      reason: parsed.data.reason,
    });

    await prisma.auditLog.create({
      data: {
        providerId: provider.id,
        userId: user.id,
        action: "appointment.payment.rejected",
        entityType: "Appointment",
        entityId: appointmentId,
        metadata: { reference: updated.reference, reason: parsed.data.reason },
      },
    });

    dispatchInBackground(
      () => notifyAppointment("customer.payment.rejected", appointmentId),
      `reject ${updated.reference}`,
    );

    refresh(appointmentId);
    return {
      status: "success",
      message: "Paiement refusé. Le créneau est de nouveau disponible.",
    };
  } catch (error) {
    return toActionState(error, "Refus impossible");
  }
}

export async function confirmWithoutDepositAction(
  appointmentId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await ownedAppointment(appointmentId);

  try {
    await confirmWithoutDeposit({ appointmentId, userId: user.id });

    dispatchInBackground(
      async () => {
        await upsertAppointmentEvent(appointmentId);
        await notifyAppointment("customer.booking.confirmed", appointmentId);
      },
      `confirm-no-deposit ${appointmentId}`,
    );

    refresh(appointmentId);
    return { status: "success", message: "Rendez-vous confirmé sans acompte." };
  } catch (error) {
    return toActionState(error, "Confirmation impossible");
  }
}

export async function cancelAppointmentAction(
  appointmentId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, provider, appointment } = await ownedAppointment(appointmentId);
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  const hadEvent = Boolean(appointment.googleEventId);

  try {
    await cancelAppointment({
      appointmentId,
      by: "PROVIDER",
      reason,
      userId: user.id,
    });

    await prisma.auditLog.create({
      data: {
        providerId: provider.id,
        userId: user.id,
        action: "appointment.cancelled",
        entityType: "Appointment",
        entityId: appointmentId,
        metadata: { reason: reason ?? null },
      },
    });

    dispatchInBackground(
      async () => {
        if (hadEvent) await deleteAppointmentEvent(appointmentId);
        await notifyAppointment("customer.booking.cancelled", appointmentId);
      },
      `cancel ${appointmentId}`,
    );

    refresh(appointmentId);
    return { status: "success", message: "Rendez-vous annulé et cliente prévenue." };
  } catch (error) {
    return toActionState(error, "Annulation impossible");
  }
}

export async function markCompletedAction(
  appointmentId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await ownedAppointment(appointmentId);

  try {
    await markCompleted({ appointmentId, userId: user.id });
    refresh(appointmentId);
    return { status: "success", message: "Rendez-vous marqué comme terminé." };
  } catch (error) {
    return toActionState(error, "Mise à jour impossible");
  }
}

export async function markNoShowAction(
  appointmentId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { user } = await ownedAppointment(appointmentId);

  try {
    await markNoShow({ appointmentId, userId: user.id });
    refresh(appointmentId);
    return { status: "success", message: "Rendez-vous marqué comme non honoré." };
  } catch (error) {
    return toActionState(error, "Mise à jour impossible");
  }
}

export async function saveProviderNoteAction(
  appointmentId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await ownedAppointment(appointmentId);

  const parsed = providerNoteSchema.safeParse({
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Note trop longue.",
      errors: fieldErrors(parsed.error),
    };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { providerNote: parsed.data.note || null },
  });

  refresh(appointmentId);
  return { status: "success", message: "Note enregistrée." };
}
