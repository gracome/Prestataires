import { cache } from "react";
import { prisma } from "@/lib/db";
import type { EstimatorConfig } from "./estimate";

/**
 * Loads the estimator configuration for one provider.
 *
 * Returns null when the provider has not switched the estimator on, or has no
 * questions yet. In that case the quote page falls back to a plain form, which
 * is still better than nothing.
 */
export const loadEstimatorConfig = cache(
  async (providerId: string): Promise<EstimatorConfig | null> => {
    const settings = await prisma.quoteSettings.findUnique({
      where: { providerId },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: { options: { orderBy: { position: "asc" } } },
        },
      },
    });

    if (!settings || !settings.estimatorEnabled) return null;
    if (settings.questions.length === 0) return null;

    return {
      basePrice: settings.basePrice,
      baseDurationMinutes: settings.baseDurationMinutes,
      marginPercent: settings.marginPercent,
      questions: settings.questions
        // A question with no option can never be answered, so it would block
        // the estimate forever if it were required.
        .filter((question) => question.options.length > 0)
        .map((question) => ({
          id: question.id,
          label: question.label,
          helpText: question.helpText,
          kind: question.kind,
          required: question.required,
          options: question.options.map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
            priceAdjustment: option.priceAdjustment,
            durationAdjustment: option.durationAdjustment,
          })),
        })),
    };
  },
);

export type QuotePageTexts = {
  intro: string | null;
  disclaimer: string | null;
};

export async function loadQuoteTexts(providerId: string): Promise<QuotePageTexts> {
  const settings = await prisma.quoteSettings.findUnique({
    where: { providerId },
    select: { intro: true, disclaimer: true },
  });

  return {
    intro: settings?.intro ?? null,
    disclaimer: settings?.disclaimer ?? null,
  };
}
