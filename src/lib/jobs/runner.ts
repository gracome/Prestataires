import { prisma } from "@/lib/db";
import {
  completePastAppointments,
  releaseExpiredAppointments,
} from "@/lib/booking/expiration";
import { notifyAppointment } from "@/lib/notifications/dispatch";
import { purgeExpiredSessions } from "@/lib/auth/session";
import { syncBusyPeriods } from "@/lib/google/calendar";

/**
 * Scheduled maintenance (cahier des charges sections 12 and 31).
 *
 * Run this every few minutes. It is safe to run concurrently: each step either
 * uses a guarded update or the notification dedupe key, so two overlapping runs
 * cannot expire the same booking twice or send the same email twice.
 */

export type JobReport = {
  expired: number;
  expiryEmails: number;
  completed: number;
  remindersSent: number;
  calendarsSynced: number;
  sessionsPurged: number;
  durationMs: number;
  errors: string[];
};

export async function runScheduledJobs(
  options: { now?: Date; syncCalendars?: boolean; sendReminders?: boolean } = {},
): Promise<JobReport> {
  const started = Date.now();
  const now = options.now ?? new Date();
  const errors: string[] = [];

  const run = await prisma.jobRun.create({
    data: { name: "scheduled-maintenance" },
    select: { id: true },
  });

  let expired = 0;
  let expiryEmails = 0;
  let completed = 0;
  let remindersSent = 0;
  let calendarsSynced = 0;
  let sessionsPurged = 0;

  try {
    // 1. Release lapsed holds and unverified proofs.
    const release = await releaseExpiredAppointments({ now, limit: 1000 });
    expired = release.expiredIds.length;

    // 2. Tell the customers whose booking expired. This also picks up rows
    //    expired lazily by a page load, since the dedupe key makes the send
    //    idempotent and the query is not limited to this run's ids.
    expiryEmails = await sendExpiryEmails(now, errors);

    // 3. Close out appointments whose time has passed.
    const closed = await completePastAppointments({ now, limit: 1000 });
    completed = closed.completedIds.length;

    // 4. Reminders, when enabled.
    if (options.sendReminders !== false) {
      remindersSent = await sendReminders(now, errors);
    }

    // 5. Refresh Google busy periods.
    if (options.syncCalendars !== false) {
      calendarsSynced = await syncCalendars(errors);
    }

    // 6. Housekeeping.
    sessionsPurged = await purgeExpiredSessions();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const report: JobReport = {
    expired,
    expiryEmails,
    completed,
    remindersSent,
    calendarsSynced,
    sessionsPurged,
    durationMs: Date.now() - started,
    errors,
  };

  await prisma.jobRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      succeeded: errors.length === 0,
      detail: report as unknown as object,
    },
  });

  return report;
}

/**
 * Notify customers of bookings that expired recently and have not yet been
 * told. The notification log is the source of truth for "already told".
 */
async function sendExpiryEmails(now: Date, errors: string[]): Promise<number> {
  const since = new Date(now.getTime() - 24 * 3_600_000);

  const candidates = await prisma.appointment.findMany({
    where: {
      status: "EXPIRED",
      updatedAt: { gte: since },
      customerEmail: { not: null },
      notifications: {
        none: { template: "customer.booking.expired" },
      },
    },
    select: { id: true },
    take: 200,
  });

  let sent = 0;
  for (const candidate of candidates) {
    const result = await notifyAppointment("customer.booking.expired", candidate.id);
    if (result.status === "SENT") sent += 1;
    else if (result.status === "FAILED") errors.push(`expiry email: ${result.error}`);
  }
  return sent;
}

/**
 * 24-hour and 2-hour reminders (cahier des charges section 16). The window is
 * generous on purpose: a run that is a few minutes late must not skip anyone,
 * and the dedupe key stops duplicates.
 */
async function sendReminders(now: Date, errors: string[]): Promise<number> {
  const windows: Array<{ label: string; hours: number; slackMinutes: number }> = [
    { label: "24h", hours: 24, slackMinutes: 60 },
    { label: "2h", hours: 2, slackMinutes: 30 },
  ];

  let sent = 0;

  for (const window of windows) {
    const target = new Date(now.getTime() + window.hours * 3_600_000);
    const from = new Date(target.getTime() - window.slackMinutes * 60_000);
    const to = new Date(target.getTime() + window.slackMinutes * 60_000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        startsAt: { gte: from, lte: to },
        customerEmail: { not: null },
      },
      select: { id: true },
      take: 200,
    });

    for (const appointment of appointments) {
      const result = await notifyAppointment("customer.reminder", appointment.id, {
        discriminator: window.label,
      });
      if (result.status === "SENT") sent += 1;
      else if (result.status === "FAILED") {
        errors.push(`reminder ${window.label}: ${result.error}`);
      }
    }
  }

  return sent;
}

async function syncCalendars(errors: string[]): Promise<number> {
  const connections = await prisma.calendarConnection.findMany({
    where: { syncEnabled: true },
    select: { providerId: true },
    take: 200,
  });

  let synced = 0;
  for (const connection of connections) {
    const result = await syncBusyPeriods(connection.providerId);
    if (result.ok) synced += 1;
    else if (result.reason && !result.reason.includes("disabled")) {
      errors.push(`calendar ${connection.providerId}: ${result.reason}`);
    }
  }
  return synced;
}
