import type { AppointmentStatus, ValidationMethod } from "@prisma/client";

/**
 * Appointment state machine (cahier des charges section 13).
 *
 * The specification lists AVAILABLE alongside the appointment statuses, but
 * AVAILABLE describes a *slot*, not a row: a slot is available when no
 * appointment in a blocking status and no time block covers it. Releasing a
 * slot therefore means moving its appointment to a non-blocking status, which
 * is what EXPIRED, CANCELLED and PAYMENT_REJECTED do.
 */

/** Statuses whose appointment occupies its time window. */
export const BLOCKING_STATUSES: readonly AppointmentStatus[] = [
  "TEMPORARILY_RESERVED",
  "AWAITING_PAYMENT",
  "PAYMENT_PROOF_SUBMITTED",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
] as const;

/** Statuses that release the slot back to AVAILABLE. */
export const RELEASING_STATUSES: readonly AppointmentStatus[] = [
  "PAYMENT_REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;

/** Statuses that can still expire on a deadline. */
export const EXPIRABLE_STATUSES: readonly AppointmentStatus[] = [
  "TEMPORARILY_RESERVED",
  "AWAITING_PAYMENT",
  "PAYMENT_PROOF_SUBMITTED",
] as const;

/** Statuses no transition can leave. */
export const TERMINAL_STATUSES: readonly AppointmentStatus[] = [
  "PAYMENT_REJECTED",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "NO_SHOW",
] as const;

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  TEMPORARILY_RESERVED: [
    "AWAITING_PAYMENT",
    "CONFIRMED",
    "CANCELLED",
    "EXPIRED",
  ],
  // CONFIRMED is reachable here on purpose: the provider may decide to
  // confirm without waiting for the deposit, typically because the customer
  // paid her in cash or she knows her. Refusing that transition left the
  // dashboard offering a button that could not work.
  AWAITING_PAYMENT: [
    "PAYMENT_PROOF_SUBMITTED",
    "CONFIRMED",
    "CANCELLED",
    "EXPIRED",
  ],
  PAYMENT_PROOF_SUBMITTED: [
    "CONFIRMED",
    "PAYMENT_REJECTED",
    "CANCELLED",
    "EXPIRED",
  ],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  PAYMENT_REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function isBlocking(status: AppointmentStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

export function isTerminal(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canExpire(status: AppointmentStatus): boolean {
  return EXPIRABLE_STATUSES.includes(status);
}

export function allowedTransitions(
  status: AppointmentStatus,
): readonly AppointmentStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return allowedTransitions(from).includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: AppointmentStatus,
    readonly to: AppointmentStatus,
  ) {
    super(`Transition ${from} -> ${to} is not allowed`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export type DeadlineSettings = {
  holdDurationMinutes: number;
  proofDeadlineMinutes: number;
  verificationDeadlineMinutes: number;
};

/**
 * Deadline attached to a status when it is entered.
 *
 * A hold never outlives the appointment it is holding: the deadline is capped
 * at the start time, otherwise a slot booked in ten minutes could stay held
 * for thirty and block nobody usefully.
 */
export function deadlineFor(
  status: AppointmentStatus,
  now: Date,
  settings: DeadlineSettings,
  startsAt?: Date,
): Date | null {
  let minutes: number | null = null;

  if (status === "TEMPORARILY_RESERVED") minutes = settings.holdDurationMinutes;
  else if (status === "AWAITING_PAYMENT") minutes = settings.proofDeadlineMinutes;
  else if (status === "PAYMENT_PROOF_SUBMITTED") {
    minutes = settings.verificationDeadlineMinutes;
  }

  if (minutes === null) return null;

  const deadline = new Date(now.getTime() + minutes * 60_000);
  if (startsAt && deadline > startsAt) return startsAt;
  return deadline;
}

/**
 * The validation route a booking takes, given the service configuration.
 * ONLINE_PAYMENT is reserved for a future aggregator (section 28); the flow
 * below already branches on the method rather than on "deposit or not".
 */
export function resolveValidationMethod(
  depositAmount: number,
  onlinePaymentEnabled = false,
): ValidationMethod {
  if (depositAmount <= 0) return "NO_DEPOSIT";
  return onlinePaymentEnabled ? "ONLINE_PAYMENT" : "MANUAL_PAYMENT";
}

/** Status a freshly created appointment starts in. */
export function initialStatus(
  method: ValidationMethod,
): AppointmentStatus {
  return method === "NO_DEPOSIT" ? "CONFIRMED" : "TEMPORARILY_RESERVED";
}

const STATUS_LABELS_FR: Record<AppointmentStatus, string> = {
  TEMPORARILY_RESERVED: "Créneau réservé temporairement",
  AWAITING_PAYMENT: "En attente de l'acompte",
  PAYMENT_PROOF_SUBMITTED: "Preuve envoyée, à vérifier",
  CONFIRMED: "Confirmé",
  PAYMENT_REJECTED: "Paiement refusé",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
  COMPLETED: "Terminé",
  NO_SHOW: "Non honoré",
};

export function statusLabelFr(status: AppointmentStatus): string {
  return STATUS_LABELS_FR[status];
}

/**
 * What the provider may do to a booking in a given state.
 *
 * The dashboard reads this instead of listing statuses itself. Deriving the
 * buttons from the transition table is what stops the interface from offering
 * an action the state machine refuses, which is exactly how "Confirmer le
 * rendez-vous" ended up doing nothing on a booking awaiting its deposit.
 */
export type ProviderAction =
  | "VERIFY_PAYMENT"
  | "CONFIRM_WITHOUT_DEPOSIT"
  | "COMPLETE"
  | "NO_SHOW"
  | "CANCEL";

export function providerActionsFor(
  status: AppointmentStatus,
  options: { hasPendingProof: boolean },
): ProviderAction[] {
  const actions: ProviderAction[] = [];

  // Verifying means accepting or refusing a proof, so both must be legal.
  if (
    options.hasPendingProof &&
    canTransition(status, "CONFIRMED") &&
    canTransition(status, "PAYMENT_REJECTED")
  ) {
    actions.push("VERIFY_PAYMENT");
  } else if (canTransition(status, "CONFIRMED")) {
    actions.push("CONFIRM_WITHOUT_DEPOSIT");
  }

  if (canTransition(status, "COMPLETED")) actions.push("COMPLETE");
  if (canTransition(status, "NO_SHOW")) actions.push("NO_SHOW");
  if (canTransition(status, "CANCELLED")) actions.push("CANCEL");

  return actions;
}

export type StatusTone = "pending" | "action" | "success" | "danger" | "neutral";

const STATUS_TONES: Record<AppointmentStatus, StatusTone> = {
  TEMPORARILY_RESERVED: "pending",
  AWAITING_PAYMENT: "pending",
  PAYMENT_PROOF_SUBMITTED: "action",
  CONFIRMED: "success",
  PAYMENT_REJECTED: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  COMPLETED: "success",
  NO_SHOW: "danger",
};

export function statusTone(status: AppointmentStatus): StatusTone {
  return STATUS_TONES[status];
}
