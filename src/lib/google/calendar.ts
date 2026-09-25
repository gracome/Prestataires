import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { formatDurationFr } from "@/lib/time";
import { formatMoney } from "@/lib/money";
import { authorisedClient } from "./oauth";

/**
 * Reading and writing the provider's Google Calendar (section 14).
 *
 * Everything here is best effort by design: a Google outage must never stop a
 * provider from confirming a booking. Failures are recorded on the connection
 * row so the dashboard can show that the calendar is out of sync.
 */

export type SyncOutcome =
  | { ok: true; eventId: string }
  | { ok: false; reason: string };

async function calendarFor(providerId: string) {
  const auth = await authorisedClient(providerId);
  if (!auth) return null;

  const connection = await prisma.calendarConnection.findUnique({
    where: { providerId },
    select: { calendarId: true },
  });

  return {
    api: google.calendar({ version: "v3", auth }),
    calendarId: connection?.calendarId ?? "primary",
  };
}

async function recordError(providerId: string, message: string): Promise<void> {
  await prisma.calendarConnection
    .updateMany({ where: { providerId }, data: { lastSyncError: message } })
    .catch(() => undefined);
}

async function recordSuccess(providerId: string): Promise<void> {
  await prisma.calendarConnection
    .updateMany({
      where: { providerId },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    })
    .catch(() => undefined);
}

/** Create or update the calendar event for a confirmed appointment. */
export async function upsertAppointmentEvent(
  appointmentId: string,
): Promise<SyncOutcome> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      provider: { include: { bookingSettings: true } },
      service: true,
    },
  });

  if (!appointment) return { ok: false, reason: "Appointment not found" };

  const { provider, service } = appointment;
  if (provider.bookingSettings?.syncToGoogleCalendar === false) {
    return { ok: false, reason: "Calendar sync disabled for this provider" };
  }

  const calendar = await calendarFor(provider.id);
  if (!calendar) return { ok: false, reason: "No Google Calendar connected" };

  const description = [
    `Cliente : ${appointment.customerName}`,
    `Téléphone : ${appointment.customerPhone}`,
    appointment.customerEmail ? `Email : ${appointment.customerEmail}` : null,
    `Prestation : ${service.name}`,
    `Durée : ${formatDurationFr(service.durationMinutes)}`,
    appointment.totalAmount > 0
      ? `Montant : ${formatMoney(appointment.totalAmount, appointment.currency, provider.locale)}`
      : null,
    appointment.depositAmount > 0
      ? `Acompte reçu : ${formatMoney(appointment.depositAmount, appointment.currency, provider.locale)}`
      : null,
    appointment.customerNote ? `Note de la cliente : ${appointment.customerNote}` : null,
    `Référence : ${appointment.reference}`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = {
    summary: `${service.name} — ${appointment.customerName}`,
    description,
    location:
      [provider.addressLine, provider.city].filter(Boolean).join(", ") || undefined,
    start: {
      dateTime: appointment.startsAt.toISOString(),
      timeZone: provider.timezone,
    },
    end: {
      dateTime: appointment.serviceEndsAt.toISOString(),
      timeZone: provider.timezone,
    },
    // The customer is not invited: the event is the provider's own record and
    // inviting them would leak the provider's calendar details.
    extendedProperties: {
      private: {
        appointmentId: appointment.id,
        reference: appointment.reference,
      },
    },
  };

  try {
    if (appointment.googleEventId) {
      const updated = await calendar.api.events.update({
        calendarId: calendar.calendarId,
        eventId: appointment.googleEventId,
        requestBody: body,
      });
      await recordSuccess(provider.id);
      return { ok: true, eventId: updated.data.id ?? appointment.googleEventId };
    }

    const created = await calendar.api.events.insert({
      calendarId: calendar.calendarId,
      requestBody: body,
    });

    const eventId = created.data.id;
    if (!eventId) return { ok: false, reason: "Google returned no event id" };

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { googleEventId: eventId },
    });
    await recordSuccess(provider.id);

    return { ok: true, eventId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await recordError(provider.id, reason);
    return { ok: false, reason };
  }
}

/** Remove the event when a confirmed appointment is cancelled. */
export async function deleteAppointmentEvent(
  appointmentId: string,
): Promise<SyncOutcome> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, providerId: true, googleEventId: true },
  });

  if (!appointment?.googleEventId) {
    return { ok: false, reason: "No calendar event to remove" };
  }

  const calendar = await calendarFor(appointment.providerId);
  if (!calendar) return { ok: false, reason: "No Google Calendar connected" };

  try {
    await calendar.api.events.delete({
      calendarId: calendar.calendarId,
      eventId: appointment.googleEventId,
    });
  } catch (error) {
    const status = (error as { code?: number }).code;
    // 404 or 410 means it is already gone, which is the desired end state.
    if (status !== 404 && status !== 410) {
      const reason = error instanceof Error ? error.message : String(error);
      await recordError(appointment.providerId, reason);
      return { ok: false, reason };
    }
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { googleEventId: null },
  });

  return { ok: true, eventId: appointment.googleEventId };
}

/**
 * Mirror Google busy periods into time blocks so they remove slots from the
 * public calendar (section 15). Events this app created are skipped, since the
 * appointment behind them already blocks its own window.
 */
export async function syncBusyPeriods(
  providerId: string,
  options: { from?: Date; to?: Date } = {},
): Promise<{ ok: boolean; imported: number; reason?: string }> {
  const settings = await prisma.bookingSettings.findUnique({
    where: { providerId },
  });

  if (settings?.blockOnGoogleBusy === false) {
    return { ok: false, imported: 0, reason: "Google busy blocking disabled" };
  }

  const calendar = await calendarFor(providerId);
  if (!calendar) {
    return { ok: false, imported: 0, reason: "No Google Calendar connected" };
  }

  const from = options.from ?? new Date();
  const to =
    options.to ??
    new Date(from.getTime() + (settings?.maxAdvanceDays ?? 60) * 86_400_000);

  try {
    const response = await calendar.api.events.list({
      calendarId: calendar.calendarId,
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
    });

    const events = response.data.items ?? [];
    const seen = new Set<string>();
    let imported = 0;

    for (const event of events) {
      if (!event.id) continue;
      if (event.status === "cancelled") continue;
      // "transparent" means the event does not mark the person as busy.
      if (event.transparency === "transparent") continue;
      // Skip the events this platform wrote; their appointment already blocks.
      if (event.extendedProperties?.private?.appointmentId) continue;

      const startsAt = parseBoundary(event.start);
      const endsAt = parseBoundary(event.end);
      if (!startsAt || !endsAt || endsAt <= startsAt) continue;

      seen.add(event.id);

      await prisma.timeBlock.upsert({
        where: {
          providerId_externalEventId: {
            providerId,
            externalEventId: event.id,
          },
        },
        create: {
          providerId,
          externalEventId: event.id,
          type: "EXTERNAL_CALENDAR",
          startsAt,
          endsAt,
          allDay: Boolean(event.start?.date),
          reason: event.summary ?? "Occupé (Google Calendar)",
        },
        update: {
          startsAt,
          endsAt,
          allDay: Boolean(event.start?.date),
          reason: event.summary ?? "Occupé (Google Calendar)",
        },
      });
      imported += 1;
    }

    // Drop mirrored blocks whose event disappeared from the window.
    await prisma.timeBlock.deleteMany({
      where: {
        providerId,
        type: "EXTERNAL_CALENDAR",
        startsAt: { gte: from },
        endsAt: { lte: to },
        ...(seen.size > 0
          ? { externalEventId: { notIn: Array.from(seen) } }
          : {}),
      },
    });

    await recordSuccess(providerId);
    return { ok: true, imported };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await recordError(providerId, reason);
    return { ok: false, imported: 0, reason };
  }
}

function parseBoundary(
  boundary: { dateTime?: string | null; date?: string | null } | undefined,
): Date | null {
  if (!boundary) return null;
  if (boundary.dateTime) return new Date(boundary.dateTime);
  if (boundary.date) return new Date(`${boundary.date}T00:00:00Z`);
  return null;
}
