"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireProviderApi } from "@/lib/auth/guard";
import {
  fieldErrors,
  timeBlockSchema,
  workingHoursSchema,
  type ActionState,
} from "@/lib/validation";
import { localDateTimeToUtc, parseMinuteOfDay } from "@/lib/time";

/**
 * Opening hours and absences (cahier des charges section 6).
 *
 * Hours are stored as minutes from local midnight in the provider timezone, so
 * "09:00 to 18:00" keeps meaning nine in the morning wherever the server runs.
 */

function refreshSchedule(slug: string): void {
  revalidatePath("/dashboard/horaires");
  revalidatePath("/dashboard/calendrier");
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/reservation`);
}

export async function saveWorkingHoursAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const days = [];
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    const active = formData.get(`day-${dayOfWeek}-active`) !== null;
    const hasBreak = formData.get(`day-${dayOfWeek}-hasBreak`) !== null;

    try {
      days.push({
        dayOfWeek,
        active,
        openMinute: parseMinuteOfDay(
          String(formData.get(`day-${dayOfWeek}-open`) ?? "09:00"),
        ),
        closeMinute: parseMinuteOfDay(
          String(formData.get(`day-${dayOfWeek}-close`) ?? "18:00"),
        ),
        breakStartMinute: hasBreak
          ? parseMinuteOfDay(String(formData.get(`day-${dayOfWeek}-breakStart`) ?? "13:00"))
          : null,
        breakEndMinute: hasBreak
          ? parseMinuteOfDay(String(formData.get(`day-${dayOfWeek}-breakEnd`) ?? "14:00"))
          : null,
      });
    } catch {
      return {
        status: "error",
        message: "Une heure saisie n'est pas valide. Utilisez le format HH:MM.",
      };
    }
  }

  const parsed = workingHoursSchema.safeParse({ days });

  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // Zod paths look like "days.2.closeMinute"; re-key them to the field names
    // the form actually uses.
    const remapped: Record<string, string> = {};
    for (const [key, message] of Object.entries(errors)) {
      const match = /^days\.(\d+)\.(\w+)$/.exec(key);
      remapped[match ? `day-${match[1]}-${match[2]}` : key] = message;
    }
    return {
      status: "error",
      message: "Merci de corriger les horaires signalés.",
      errors: remapped,
    };
  }

  await prisma.$transaction(
    parsed.data.days.map((day) =>
      prisma.workingHours.upsert({
        where: {
          providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: day.dayOfWeek },
        },
        create: { providerId: provider.id, ...day },
        update: day,
      }),
    ),
  );

  refreshSchedule(provider.slug);
  return { status: "success", message: "Horaires enregistrés." };
}

export async function createTimeBlockAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const allDay = formData.get("allDay") !== null;
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? startDate);
  const startTime = String(formData.get("startTime") ?? "00:00");
  const endTime = String(formData.get("endTime") ?? "23:59");

  if (!startDate) {
    return { status: "error", message: "Indiquez une date de début." };
  }

  let startsAt: Date;
  let endsAt: Date;

  try {
    startsAt = allDay
      ? localDateTimeToUtc(startDate, 0, provider.timezone)
      : localDateTimeToUtc(startDate, parseMinuteOfDay(startTime), provider.timezone);

    endsAt = allDay
      ? // An all-day block runs to midnight at the end of the last day.
        localDateTimeToUtc(endDate || startDate, 24 * 60, provider.timezone)
      : localDateTimeToUtc(
          endDate || startDate,
          parseMinuteOfDay(endTime),
          provider.timezone,
        );
  } catch {
    return { status: "error", message: "Dates ou heures invalides." };
  }

  const parsed = timeBlockSchema.safeParse({
    type: String(formData.get("type") ?? "MANUAL_BLOCK"),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    reason: String(formData.get("reason") ?? ""),
    allDay: formData.get("allDay"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "La fin doit suivre le début.",
      errors: fieldErrors(parsed.error),
    };
  }

  // Warn rather than block: the provider may legitimately want to close a
  // period and then cancel the bookings inside it themselves.
  const conflicts = await prisma.appointment.count({
    where: {
      providerId: provider.id,
      status: { in: ["CONFIRMED", "PAYMENT_PROOF_SUBMITTED", "AWAITING_PAYMENT", "TEMPORARILY_RESERVED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  await prisma.timeBlock.create({
    data: {
      providerId: provider.id,
      type: parsed.data.type,
      startsAt,
      endsAt,
      allDay: parsed.data.allDay,
      reason: parsed.data.reason || null,
    },
  });

  refreshSchedule(provider.slug);

  return {
    status: "success",
    message:
      conflicts > 0
        ? `Indisponibilité enregistrée. Attention : ${conflicts} rendez-vous déjà pris tombe${conflicts > 1 ? "nt" : ""} dans cette période, pensez à les annuler.`
        : "Indisponibilité enregistrée.",
  };
}

export async function deleteTimeBlockAction(blockId: string): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const deleted = await prisma.timeBlock.deleteMany({
    where: { id: blockId, providerId: provider.id, type: { not: "EXTERNAL_CALENDAR" } },
  });

  if (deleted.count === 0) {
    return {
      status: "error",
      message:
        "Indisponibilité introuvable, ou issue de Google Calendar : modifiez-la directement dans votre calendrier.",
    };
  }

  refreshSchedule(provider.slug);
  return { status: "success", message: "Indisponibilité supprimée." };
}
