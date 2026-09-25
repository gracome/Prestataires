"use server";

import { revalidatePath } from "next/cache";
import type { QuoteRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireProviderApi } from "@/lib/auth/guard";
import { deleteFile } from "@/lib/storage";
import { toMinorUnits } from "@/lib/money";
import {
  fieldErrors,
  quoteOptionSchema,
  quoteQuestionSchema,
  quoteSettingsSchema,
  type ActionState,
} from "@/lib/validation";

/**
 * Quote follow-up and estimator configuration (cahier des charges section 18).
 */

function refreshQuotes(slug: string): void {
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  revalidatePath(`/${slug}/devis`);
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// ---------------------------------------------------------------------------
// Incoming requests
// ---------------------------------------------------------------------------

const ALLOWED: QuoteRequestStatus[] = ["NEW", "IN_PROGRESS", "ANSWERED", "CLOSED"];

export async function setQuoteStatusAction(
  quoteId: string,
  status: QuoteRequestStatus,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  if (!ALLOWED.includes(status)) {
    return { status: "error", message: "Statut inconnu." };
  }

  const updated = await prisma.quoteRequest.updateMany({
    where: { id: quoteId, providerId: provider.id },
    data: { status },
  });

  if (updated.count === 0) {
    return { status: "error", message: "Demande introuvable." };
  }

  refreshQuotes(provider.slug);
  return { status: "success", message: "Statut mis à jour." };
}

export async function deleteQuoteAction(quoteId: string): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const quote = await prisma.quoteRequest.findFirst({
    where: { id: quoteId, providerId: provider.id },
    select: { id: true, attachmentKey: true },
  });

  if (!quote) return { status: "error", message: "Demande introuvable." };

  await prisma.quoteRequest.delete({ where: { id: quote.id } });
  if (quote.attachmentKey) await deleteFile(quote.attachmentKey).catch(() => undefined);

  refreshQuotes(provider.slug);
  return { status: "success", message: "Demande supprimée." };
}

// ---------------------------------------------------------------------------
// Estimator configuration
// ---------------------------------------------------------------------------

/** The settings row, created on first use. */
async function settingsFor(providerId: string): Promise<{ id: string }> {
  return prisma.quoteSettings.upsert({
    where: { providerId },
    create: { providerId },
    update: {},
    select: { id: true },
  });
}

export async function saveQuoteSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const parsed = quoteSettingsSchema.safeParse({
    estimatorEnabled: formData.get("estimatorEnabled"),
    // Typed in whole currency units, stored in minor units.
    basePrice: toMinorUnits(read(formData, "basePrice") || "0", provider.currency),
    baseDurationMinutes: read(formData, "baseDurationMinutes") || "60",
    marginPercent: read(formData, "marginPercent") || "15",
    intro: read(formData, "intro"),
    disclaimer: read(formData, "disclaimer"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = {
    estimatorEnabled: parsed.data.estimatorEnabled,
    basePrice: parsed.data.basePrice,
    baseDurationMinutes: parsed.data.baseDurationMinutes,
    marginPercent: parsed.data.marginPercent,
    intro: parsed.data.intro || null,
    disclaimer: parsed.data.disclaimer || null,
  };

  await prisma.quoteSettings.upsert({
    where: { providerId: provider.id },
    create: { providerId: provider.id, ...data },
    update: data,
  });

  refreshQuotes(provider.slug);
  return { status: "success", message: "Estimateur enregistré." };
}

export async function saveQuoteQuestionAction(
  questionId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const parsed = quoteQuestionSchema.safeParse({
    label: read(formData, "label"),
    helpText: read(formData, "helpText"),
    kind: read(formData, "kind") || "SINGLE_CHOICE",
    required: formData.get("required"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = {
    label: parsed.data.label,
    helpText: parsed.data.helpText || null,
    kind: parsed.data.kind,
    required: parsed.data.required,
  };

  if (questionId) {
    const existing = await ownedQuestion(questionId, provider.id);
    if (!existing) return { status: "error", message: "Question introuvable." };
    await prisma.quoteQuestion.update({ where: { id: questionId }, data });
  } else {
    const settings = await settingsFor(provider.id);
    const count = await prisma.quoteQuestion.count({
      where: { settingsId: settings.id },
    });
    await prisma.quoteQuestion.create({
      data: { settingsId: settings.id, position: count, ...data },
    });
  }

  refreshQuotes(provider.slug);
  return { status: "success", message: "Question enregistrée." };
}

export async function deleteQuoteQuestionAction(
  questionId: string,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const existing = await ownedQuestion(questionId, provider.id);
  if (!existing) return { status: "error", message: "Question introuvable." };

  await prisma.quoteQuestion.delete({ where: { id: questionId } });

  refreshQuotes(provider.slug);
  return { status: "success", message: "Question supprimée." };
}

export async function saveQuoteOptionAction(
  questionId: string,
  optionId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const question = await ownedQuestion(questionId, provider.id);
  if (!question) return { status: "error", message: "Question introuvable." };

  const parsed = quoteOptionSchema.safeParse({
    label: read(formData, "label"),
    description: read(formData, "description"),
    priceAdjustment: toMinorUnits(
      read(formData, "priceAdjustment") || "0",
      provider.currency,
    ),
    durationAdjustment: read(formData, "durationAdjustment") || "0",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = {
    label: parsed.data.label,
    description: parsed.data.description || null,
    priceAdjustment: parsed.data.priceAdjustment,
    durationAdjustment: parsed.data.durationAdjustment,
  };

  if (optionId) {
    const updated = await prisma.quoteOption.updateMany({
      where: { id: optionId, questionId },
      data,
    });
    if (updated.count === 0) return { status: "error", message: "Réponse introuvable." };
  } else {
    const count = await prisma.quoteOption.count({ where: { questionId } });
    await prisma.quoteOption.create({
      data: { questionId, position: count, ...data },
    });
  }

  refreshQuotes(provider.slug);
  return { status: "success", message: "Réponse enregistrée." };
}

export async function deleteQuoteOptionAction(
  optionId: string,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const option = await prisma.quoteOption.findFirst({
    where: { id: optionId, question: { settings: { providerId: provider.id } } },
    select: { id: true },
  });

  if (!option) return { status: "error", message: "Réponse introuvable." };

  await prisma.quoteOption.delete({ where: { id: optionId } });

  refreshQuotes(provider.slug);
  return { status: "success", message: "Réponse supprimée." };
}

/** Confirms the question belongs to the signed-in provider. */
async function ownedQuestion(questionId: string, providerId: string) {
  return prisma.quoteQuestion.findFirst({
    where: { id: questionId, settings: { providerId } },
    select: { id: true },
  });
}
