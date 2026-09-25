import { computeDeposit, formatMoney } from "@/lib/money";
import { formatDurationFr } from "@/lib/time";
import type { ServiceCardData } from "@/components/public/ServiceCard";
import type { ShowcaseService } from "./public-site";

/**
 * Turns a prestation row into what the catalogue card needs.
 *
 * Prices and deposits are formatted once here rather than in the component,
 * so the card stays a presentation concern and the money rules stay in one
 * place.
 */
export function toServiceCard(
  service: ShowcaseService,
  options: { currency: string; locale: string; showPrices?: boolean },
): ServiceCardData {
  const { currency, locale, showPrices = true } = options;

  const deposit = computeDeposit(service.price, {
    depositRequired: service.depositRequired,
    depositType: service.depositType,
    depositValue: service.depositValue,
  });

  const quoteOnly = service.priceType === "QUOTE_ONLY";

  const priceLabel = !showPrices
    ? "Tarif sur demande"
    : quoteOnly
      ? "Sur devis"
      : `${service.priceType === "STARTING_FROM" ? "dès " : ""}${formatMoney(service.price, currency, locale)}`;

  return {
    slug: service.slug,
    name: service.name,
    shortDescription: service.shortDescription,
    imageUrl: service.imageUrl,
    popular: service.popular,
    quoteOnly,
    stepCount: service.steps.length,
    durationLabel: formatDurationFr(service.durationMinutes),
    priceLabel,
    depositLabel:
      showPrices && deposit > 0 ? formatMoney(deposit, currency, locale) : null,
  };
}
