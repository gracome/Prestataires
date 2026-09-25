"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProviderApi } from "@/lib/auth/guard";
import { toMinorUnits } from "@/lib/money";
import { localDateTimeToUtc, type LocalDate } from "@/lib/time";
import { parseAmountInput } from "@/lib/till/amount";
import type { ActionState } from "@/lib/validation";

/**
 * Recording what came in at the counter.
 *
 * The screen is used between two customers, so the form asks for as little as
 * possible: what, how much, how paid. Everything else is optional, and the
 * time defaults to now.
 *
 * The amount is recomputed from the form in minor units rather than trusted:
 * a price typed as "6 000" and one typed as "6000" must land on the same row.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

const saleSchema = z.object({
  label: z.string().trim().min(1, "Indiquez ce qui a été fait."),
  serviceId: z.string().trim().optional(),
  amount: z
    .string()
    .min(1, "Indiquez le montant encaissé.")
    .transform(parseAmountInput)
    .refine((value): value is string => value !== null, {
      message: "Montant invalide. Indiquez un nombre supérieur à zéro.",
    }),
  method: z.enum(["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "OTHER"]),
  customerName: z.string().trim().optional(),
  date: z.string().regex(DATE, "Date invalide."),
  time: z.string().regex(TIME, "Heure invalide."),
  note: z.string().trim().optional(),
});

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function recordSaleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider, user } = await requireProviderApi("till");

  const parsed = saleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // A prestation picked from the catalogue keeps its identity, so the reports
  // can group by it even after she renames it.
  let serviceId: string | null = null;
  if (data.serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, providerId: provider.id },
      select: { id: true },
    });
    serviceId = service?.id ?? null;
  }

  await prisma.sale.create({
    data: {
      providerId: provider.id,
      serviceId,
      label: data.label,
      amount: toMinorUnits(data.amount, provider.currency),
      currency: provider.currency,
      method: data.method,
      customerName: data.customerName || null,
      note: data.note || null,
      occurredAt: localDateTimeToUtc(
        data.date as LocalDate,
        minutesOf(data.time),
        provider.timezone,
      ),
      recordedById: user.id,
    },
  });

  revalidatePath("/dashboard/caisse");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rapports");

  return { status: "success", message: "Encaissement enregistré." };
}

export async function deleteSaleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi("till");

  const sale = await prisma.sale.findUnique({
    where: { id: String(formData.get("saleId") ?? "") },
    select: { id: true, providerId: true },
  });

  // Checking the owner here rather than filtering in the delete: a wrong id
  // must answer "not found", never quietly delete someone else's line.
  if (!sale || sale.providerId !== provider.id) {
    return { status: "error", message: "Ligne introuvable." };
  }

  await prisma.sale.delete({ where: { id: sale.id } });

  revalidatePath("/dashboard/caisse");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rapports");

  return { status: "success", message: "Ligne supprimée." };
}
