import { after } from "next/server";
import type { NotificationChannel } from "@prisma/client";
import { prisma, isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";
import * as templates from "@/lib/email/templates";
import type { TemplateName } from "@/lib/email/templates";

/**
 * Notification dispatch (cahier des charges section 16).
 *
 * Every send is recorded in notification_logs with a unique dedupe key, so an
 * expiry sweep that runs twice, or a retried request, cannot email the same
 * person twice for the same event. The log row is claimed first; only then is
 * the message actually sent.
 */

export type DispatchResult =
  | { status: "SENT" }
  | { status: "SKIPPED"; reason: string }
  | { status: "FAILED"; error: string };

type Claim = { id: string } | null;

/**
 * Insert the log row. A duplicate key means another run already owns this
 * notification, so this call stands down.
 */
async function claim(params: {
  providerId: string;
  appointmentId?: string | null;
  template: TemplateName;
  recipient: string;
  subject: string;
  dedupeKey: string;
  channel?: NotificationChannel;
}): Promise<Claim> {
  try {
    return await prisma.notificationLog.create({
      data: {
        providerId: params.providerId,
        appointmentId: params.appointmentId ?? null,
        template: params.template,
        recipient: params.recipient,
        subject: params.subject,
        dedupeKey: params.dedupeKey,
        channel: params.channel ?? "EMAIL",
        status: "PENDING",
      },
      select: { id: true },
    });
  } catch (error) {
    if (isPgError(error, PG_UNIQUE_VIOLATION) || isPgError(error, "P2002")) {
      return null;
    }
    throw error;
  }
}

export type AppointmentNotification = Extract<
  TemplateName,
  | "provider.booking.created"
  | "provider.booking.cancelled"
  | "provider.proof.submitted"
  | "customer.booking.awaiting_payment"
  | "customer.booking.confirmed"
  | "customer.payment.rejected"
  | "customer.booking.expired"
  | "customer.booking.cancelled"
  | "customer.reminder"
>;

/**
 * Send one appointment notification. `discriminator` separates repeats of the
 * same template for one appointment, such as a 24-hour and a 2-hour reminder.
 */
export async function notifyAppointment(
  template: AppointmentNotification,
  appointmentId: string,
  options: { discriminator?: string } = {},
): Promise<DispatchResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      provider: { include: { theme: true, paymentInstructions: true, bookingSettings: true } },
      service: true,
    },
  });

  if (!appointment) return { status: "SKIPPED", reason: "Appointment not found" };

  const { provider, service } = appointment;
  const toProvider = template.startsWith("provider.");
  const recipient = toProvider ? provider.email : appointment.customerEmail;

  if (!recipient) {
    return { status: "SKIPPED", reason: "No recipient address on file" };
  }

  const ctx: templates.AppointmentContext = {
    provider,
    service,
    appointment,
    primaryColor: provider.theme?.primaryColor,
    paymentInstructions: provider.paymentInstructions.filter((p) => p.active),
    deadlineMinutes:
      template === "customer.booking.awaiting_payment"
        ? provider.bookingSettings?.proofDeadlineMinutes
        : template === "provider.proof.submitted"
          ? provider.bookingSettings?.verificationDeadlineMinutes
          : undefined,
  };

  const rendered = renderFor(template, ctx);

  const dedupeKey = [
    template,
    appointmentId,
    options.discriminator ?? "",
  ].join(":");

  const claimed = await claim({
    providerId: provider.id,
    appointmentId,
    template,
    recipient,
    subject: rendered.subject,
    dedupeKey,
  });

  if (!claimed) {
    return { status: "SKIPPED", reason: "Already sent" };
  }

  const result = await sendMail({
    to: recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: toProvider ? (appointment.customerEmail ?? undefined) : provider.email,
  });

  await prisma.notificationLog.update({
    where: { id: claimed.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      error: result.error ?? null,
    },
  });

  return result.ok
    ? { status: "SENT" }
    : { status: "FAILED", error: result.error ?? "Unknown error" };
}

function renderFor(
  template: AppointmentNotification,
  ctx: templates.AppointmentContext,
): templates.RenderedEmail {
  switch (template) {
    case "provider.booking.created":
      return templates.providerBookingCreated(ctx);
    case "provider.booking.cancelled":
      return templates.providerBookingCancelled(ctx);
    case "provider.proof.submitted":
      return templates.providerProofSubmitted(ctx);
    case "customer.booking.awaiting_payment":
      return templates.customerAwaitingPayment(ctx);
    case "customer.booking.confirmed":
      return templates.customerConfirmed(ctx);
    case "customer.payment.rejected":
      return templates.customerPaymentRejected(ctx);
    case "customer.booking.expired":
      return templates.customerExpired(ctx);
    case "customer.booking.cancelled":
      return templates.customerCancelled(ctx);
    case "customer.reminder":
      return templates.customerReminder(ctx);
  }
}

export async function notifyQuoteRequest(
  quoteId: string,
): Promise<DispatchResult> {
  const quote = await prisma.quoteRequest.findUnique({
    where: { id: quoteId },
    include: { provider: { include: { theme: true } }, service: true },
  });

  if (!quote) return { status: "SKIPPED", reason: "Quote not found" };

  const rendered = templates.providerQuoteReceived({
    provider: quote.provider,
    quote,
    service: quote.service,
    primaryColor: quote.provider.theme?.primaryColor,
  });

  const claimed = await claim({
    providerId: quote.providerId,
    template: "provider.quote.received",
    recipient: quote.provider.email,
    subject: rendered.subject,
    dedupeKey: `provider.quote.received:${quoteId}:`,
  });

  if (!claimed) return { status: "SKIPPED", reason: "Already sent" };

  const result = await sendMail({
    to: quote.provider.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: quote.customerEmail ?? undefined,
  });

  await prisma.notificationLog.update({
    where: { id: claimed.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      error: result.error ?? null,
    },
  });

  return result.ok
    ? { status: "SENT" }
    : { status: "FAILED", error: result.error ?? "Unknown error" };
}

/**
 * Send notifications after the response, without making the caller wait.
 *
 * A booking must not be rejected because an SMTP server is slow, so the
 * handler returns as soon as the database is consistent. `after` is what keeps
 * that safe on a serverless host: a bare floating promise would be cut off
 * when the function freezes, whereas `after` holds the invocation open until
 * the work finishes.
 *
 * Failures are swallowed here on purpose. They are already recorded in
 * notification_logs, and a failed email must never undo a confirmed booking.
 */
export function dispatchInBackground(
  work: () => Promise<unknown>,
  label: string,
): void {
  after(async () => {
    try {
      await work();
    } catch (error) {

      console.error(`[notifications] ${label} failed`, error);
    }
  });
}
