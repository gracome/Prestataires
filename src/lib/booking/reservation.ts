import type {
  Appointment,
  AppointmentStatus,
  CancelledBy,
  Prisma,
} from "@prisma/client";
import { isSlotConflictError, prisma } from "@/lib/db";
import { bookingReference } from "@/lib/ids";
import { randomToken } from "@/lib/crypto";
import { computeDeposit } from "@/lib/money";
import {
  assertTransition,
  deadlineFor,
  resolveValidationMethod,
  type DeadlineSettings,
} from "./state-machine";
import { computeWindow } from "./availability";
import {
  loadAvailabilityContext,
  verifySlotStillFree,
} from "./availability-service";

/**
 * Creating and moving appointments through their lifecycle.
 *
 * Double booking is prevented at two levels. The application re-checks
 * availability inside the transaction, and the database enforces a GiST
 * exclusion constraint over (provider, time range) for blocking statuses.
 * The constraint is what actually settles two simultaneous requests; the
 * application check exists to return a friendly answer in the common case.
 */

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code:
      | "SLOT_TAKEN"
      | "SLOT_INVALID"
      | "SERVICE_UNAVAILABLE"
      | "PROVIDER_UNAVAILABLE"
      | "BOOKING_DISABLED"
      | "NOT_FOUND"
      | "INVALID_STATE"
      | "DEADLINE_PASSED",
    readonly status = 400,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export type CreateBookingInput = {
  providerId: string;
  serviceId: string;
  startsAt: Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerNote?: string | null;
  now?: Date;
};

export type CreateBookingResult = {
  appointment: Appointment;
  requiresDeposit: boolean;
};

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const now = input.now ?? new Date();

  const context = await loadAvailabilityContext(
    input.providerId,
    input.serviceId,
  );

  const [provider, service] = await Promise.all([
    prisma.provider.findUniqueOrThrow({
      where: { id: input.providerId },
      include: { bookingSettings: true },
    }),
    prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } }),
  ]);

  const settings = provider.bookingSettings;
  const deadlines: DeadlineSettings = {
    holdDurationMinutes: settings?.holdDurationMinutes ?? 30,
    proofDeadlineMinutes: settings?.proofDeadlineMinutes ?? 30,
    verificationDeadlineMinutes: settings?.verificationDeadlineMinutes ?? 120,
  };

  const window = computeWindow(input.startsAt, context.service, context.rules);

  const totalAmount = service.price;
  const depositAmount = computeDeposit(totalAmount, {
    depositRequired: service.depositRequired,
    depositType: service.depositType,
    depositValue: service.depositValue,
  });

  const validationMethod = resolveValidationMethod(depositAmount);
  const requiresDeposit = validationMethod !== "NO_DEPOSIT";

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      // Release stale holds that overlap this window before anything else, so
      // an abandoned reservation does not block a legitimate booking.
      await expireOverlappingHolds(tx, {
        providerId: input.providerId,
        from: window.startsAt,
        to: window.endsAt,
        now,
      });

      const free = await verifySlotStillFree(context, input.startsAt, {
        now,
        tx,
      });
      if (!free) {
        throw new BookingError(
          "This slot is no longer available",
          "SLOT_TAKEN",
          409,
        );
      }

      const created = await tx.appointment.create({
        data: {
          reference: bookingReference(),
          accessToken: randomToken(),
          providerId: input.providerId,
          serviceId: input.serviceId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail ?? null,
          customerNote: input.customerNote ?? null,
          startsAt: window.startsAt,
          serviceEndsAt: window.serviceEndsAt,
          endsAt: window.endsAt,
          status: requiresDeposit ? "TEMPORARILY_RESERVED" : "CONFIRMED",
          validationMethod,
          currency: provider.currency,
          totalAmount,
          depositAmount,
          balanceAmount: Math.max(0, totalAmount - depositAmount),
          paymentStatus: requiresDeposit ? "PENDING" : "NOT_REQUIRED",
          expiresAt: requiresDeposit
            ? deadlineFor(
                "TEMPORARILY_RESERVED",
                now,
                deadlines,
                window.startsAt,
              )
            : null,
        },
      });

      await tx.appointmentEvent.create({
        data: {
          appointmentId: created.id,
          fromStatus: null,
          toStatus: created.status,
          actor: "customer",
          reason: "Booking created",
          metadata: { validationMethod, depositAmount },
        },
      });

      if (!requiresDeposit) return created;

      // The customer is shown the payment instructions straight away, so the
      // booking moves on to AWAITING_PAYMENT in the same act. Both steps are
      // recorded to keep the documented lifecycle auditable.
      assertTransition("TEMPORARILY_RESERVED", "AWAITING_PAYMENT");

      const awaiting = await tx.appointment.update({
        where: { id: created.id },
        data: {
          status: "AWAITING_PAYMENT",
          expiresAt: deadlineFor(
            "AWAITING_PAYMENT",
            now,
            deadlines,
            window.startsAt,
          ),
        },
      });

      await tx.appointmentEvent.create({
        data: {
          appointmentId: created.id,
          fromStatus: "TEMPORARILY_RESERVED",
          toStatus: "AWAITING_PAYMENT",
          actor: "system",
          reason: "Deposit instructions presented to the customer",
        },
      });

      return awaiting;
    });

    return { appointment, requiresDeposit };
  } catch (error) {
    if (isSlotConflictError(error)) {
      throw new BookingError(
        "This slot was taken by another customer",
        "SLOT_TAKEN",
        409,
      );
    }
    throw error;
  }
}

/**
 * Expire holds overlapping a window. Runs inside the booking transaction so
 * the exclusion constraint does not reject an insert because of a hold that
 * has already lapsed but has not been swept yet.
 */
async function expireOverlappingHolds(
  tx: Prisma.TransactionClient,
  params: { providerId: string; from: Date; to: Date; now: Date },
): Promise<void> {
  const stale = await tx.appointment.findMany({
    where: {
      providerId: params.providerId,
      status: {
        in: ["TEMPORARILY_RESERVED", "AWAITING_PAYMENT", "PAYMENT_PROOF_SUBMITTED"],
      },
      startsAt: { lt: params.to },
      endsAt: { gt: params.from },
      OR: [
        { expiresAt: { lte: params.now } },
        { startsAt: { lte: params.now } },
      ],
    },
    select: { id: true, status: true },
  });

  for (const row of stale) {
    const updated = await tx.appointment.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: "EXPIRED", expiresAt: null },
    });
    if (updated.count === 0) continue;

    await tx.appointmentEvent.create({
      data: {
        appointmentId: row.id,
        fromStatus: row.status,
        toStatus: "EXPIRED",
        actor: "system",
        reason: "Released while another customer booked the same window",
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export type TransitionActor = {
  kind: "customer" | "provider" | "system";
  userId?: string;
  label?: string;
};

async function loadForTransition(
  tx: Prisma.TransactionClient,
  appointmentId: string,
): Promise<Appointment> {
  const appointment = await tx.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    throw new BookingError("Appointment not found", "NOT_FOUND", 404);
  }
  return appointment;
}

async function deadlineSettingsFor(
  tx: Prisma.TransactionClient,
  providerId: string,
): Promise<DeadlineSettings> {
  const settings = await tx.bookingSettings.findUnique({
    where: { providerId },
  });
  return {
    holdDurationMinutes: settings?.holdDurationMinutes ?? 30,
    proofDeadlineMinutes: settings?.proofDeadlineMinutes ?? 30,
    verificationDeadlineMinutes: settings?.verificationDeadlineMinutes ?? 120,
  };
}

/** Record the transition and update the row, guarded against a lost update. */
async function applyTransition(
  tx: Prisma.TransactionClient,
  appointment: Appointment,
  to: AppointmentStatus,
  actor: TransitionActor,
  data: Prisma.AppointmentUpdateInput = {},
  reason?: string,
): Promise<Appointment> {
  assertTransition(appointment.status, to);

  const guarded = await tx.appointment.updateMany({
    where: { id: appointment.id, status: appointment.status },
    data: { status: to, ...(data as Prisma.AppointmentUpdateManyMutationInput) },
  });

  if (guarded.count === 0) {
    throw new BookingError(
      "The appointment changed while this action was running",
      "INVALID_STATE",
      409,
    );
  }

  await tx.appointmentEvent.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: appointment.status,
      toStatus: to,
      actor: actor.label ?? actor.kind,
      reason,
    },
  });

  return tx.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
}

export type SubmitProofInput = {
  appointmentId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  now?: Date;
};

/** Section 9 - the customer uploads a proof of the manual deposit. */
export async function submitPaymentProof(
  input: SubmitProofInput,
): Promise<Appointment> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const appointment = await loadForTransition(tx, input.appointmentId);

    if (
      appointment.status !== "AWAITING_PAYMENT" &&
      appointment.status !== "TEMPORARILY_RESERVED"
    ) {
      throw new BookingError(
        "This booking is not waiting for a payment proof",
        "INVALID_STATE",
        409,
      );
    }

    if (appointment.expiresAt && appointment.expiresAt <= now) {
      throw new BookingError(
        "The deadline to send the proof has passed",
        "DEADLINE_PASSED",
        410,
      );
    }

    // Any earlier proof is kept for the audit trail but no longer current.
    await tx.paymentProof.updateMany({
      where: { appointmentId: appointment.id, status: "SUBMITTED" },
      data: { status: "SUPERSEDED" },
    });

    await tx.paymentProof.create({
      data: {
        appointmentId: appointment.id,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum ?? null,
        status: "SUBMITTED",
        submittedAt: now,
      },
    });

    const deadlines = await deadlineSettingsFor(tx, appointment.providerId);

    let current = appointment;
    if (current.status === "TEMPORARILY_RESERVED") {
      current = await applyTransition(
        tx,
        current,
        "AWAITING_PAYMENT",
        { kind: "system" },
        {
          expiresAt: deadlineFor(
            "AWAITING_PAYMENT",
            now,
            deadlines,
            current.startsAt,
          ),
        },
      );
    }

    return applyTransition(
      tx,
      current,
      "PAYMENT_PROOF_SUBMITTED",
      { kind: "customer" },
      {
        paymentStatus: "PROOF_SUBMITTED",
        paymentSubmittedAt: now,
        paymentRejectionReason: null,
        expiresAt: deadlineFor(
          "PAYMENT_PROOF_SUBMITTED",
          now,
          deadlines,
          current.startsAt,
        ),
      },
      "Payment proof uploaded",
    );
  });
}

/** Section 10 - the provider accepts the deposit and confirms the booking. */
export async function confirmPayment(params: {
  appointmentId: string;
  userId: string;
  note?: string;
  now?: Date;
}): Promise<Appointment> {
  const now = params.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const appointment = await loadForTransition(tx, params.appointmentId);

    await tx.paymentProof.updateMany({
      where: { appointmentId: appointment.id, status: "SUBMITTED" },
      data: {
        status: "ACCEPTED",
        reviewedAt: now,
        reviewedByUserId: params.userId,
      },
    });

    return applyTransition(
      tx,
      appointment,
      "CONFIRMED",
      { kind: "provider", userId: params.userId },
      {
        paymentStatus: "VERIFIED",
        paymentVerifiedAt: now,
        paymentRejectedAt: null,
        paymentRejectionReason: null,
        expiresAt: null,
        ...(params.note ? { providerNote: params.note } : {}),
      },
      "Deposit verified by the provider",
    );
  });
}

/** Section 10 - the provider refuses the deposit; the slot is released. */
export async function rejectPayment(params: {
  appointmentId: string;
  userId: string;
  reason: string;
  now?: Date;
}): Promise<Appointment> {
  const now = params.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const appointment = await loadForTransition(tx, params.appointmentId);

    await tx.paymentProof.updateMany({
      where: { appointmentId: appointment.id, status: "SUBMITTED" },
      data: {
        status: "REJECTED",
        rejectionReason: params.reason,
        reviewedAt: now,
        reviewedByUserId: params.userId,
      },
    });

    return applyTransition(
      tx,
      appointment,
      "PAYMENT_REJECTED",
      { kind: "provider", userId: params.userId },
      {
        paymentStatus: "REJECTED",
        paymentRejectedAt: now,
        paymentRejectionReason: params.reason,
        expiresAt: null,
      },
      params.reason,
    );
  });
}

export async function cancelAppointment(params: {
  appointmentId: string;
  by: CancelledBy;
  reason?: string;
  userId?: string;
  now?: Date;
}): Promise<Appointment> {
  const now = params.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const appointment = await loadForTransition(tx, params.appointmentId);

    return applyTransition(
      tx,
      appointment,
      "CANCELLED",
      {
        kind: params.by === "PROVIDER" ? "provider" : "customer",
        userId: params.userId,
      },
      {
        cancelledAt: now,
        cancelledBy: params.by,
        cancellationReason: params.reason ?? null,
        expiresAt: null,
      },
      params.reason,
    );
  });
}

export async function markCompleted(params: {
  appointmentId: string;
  userId: string;
}): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await loadForTransition(tx, params.appointmentId);
    return applyTransition(
      tx,
      appointment,
      "COMPLETED",
      { kind: "provider", userId: params.userId },
      {},
      "Marked as completed",
    );
  });
}

export async function markNoShow(params: {
  appointmentId: string;
  userId: string;
}): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await loadForTransition(tx, params.appointmentId);
    return applyTransition(
      tx,
      appointment,
      "NO_SHOW",
      { kind: "provider", userId: params.userId },
      {},
      "Customer did not show up",
    );
  });
}

/** Confirm a booking that needs no deposit but was held for another reason. */
export async function confirmWithoutDeposit(params: {
  appointmentId: string;
  userId: string;
}): Promise<Appointment> {
  return prisma.$transaction(async (tx) => {
    const appointment = await loadForTransition(tx, params.appointmentId);
    return applyTransition(
      tx,
      appointment,
      "CONFIRMED",
      { kind: "provider", userId: params.userId },
      { paymentStatus: "NOT_REQUIRED", expiresAt: null },
      "Confirmed by the provider without a deposit",
    );
  });
}
