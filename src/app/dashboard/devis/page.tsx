import { Suspense } from "react";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDurationFr, formatLocalTime, formatLongDateFr } from "@/lib/time";
import { computeEstimate } from "@/lib/quotes/estimate";
import { loadEstimatorConfig } from "@/lib/quotes/config";
import { parseEstimateAnswers } from "@/lib/email/templates";
import {
  EmptyState,
  PageHeader,
  Section,
  SkeletonForm,
  SkeletonList,
} from "@/components/dashboard/ui";
import { QuoteList, type QuoteRow } from "@/components/dashboard/QuoteList";
import { QuoteEstimatorConfig } from "@/components/dashboard/QuoteEstimatorConfig";

export const dynamic = "force-dynamic";

export default async function DevisPage() {
  const { provider } = await requireSection("quotes");

  return (
    <>
      <PageHeader
        title="Devis"
        description="Une demande de devis n'est pas un formulaire vide : la cliente répond à quelques questions, voit une fourchette de prix, puis vous écrit."
      />

      <Suspense
        fallback={
          <>
            <Section title="Demandes reçues">
              <SkeletonList count={2} label="Chargement des demandes…" />
            </Section>
            <Section title="Configurer l'estimation">
              <SkeletonForm rows={4} />
            </Section>
          </>
        }
      >
        <DevisContent providerId={provider.id} />
      </Suspense>
    </>
  );
}

async function DevisContent({ providerId }: { providerId: string }) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });
  const tz = provider.timezone;
  const money = (amount: number) => formatMoney(amount, provider.currency, provider.locale);

  const [quotes, settings, config] = await Promise.all([
    prisma.quoteRequest.findMany({
      where: { providerId: provider.id },
      include: { service: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.quoteSettings.findUnique({
      where: { providerId: provider.id },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: { options: { orderBy: { position: "asc" } } },
        },
      },
    }),
    loadEstimatorConfig(provider.id),
  ]);

  const rows: QuoteRow[] = quotes.map((quote) => ({
    id: quote.id,
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    serviceName: quote.service?.name ?? null,
    description: quote.description,
    budgetLabel: quote.budgetAmount ? money(quote.budgetAmount) : null,
    preferredDateLabel: quote.preferredDate
      ? formatLongDateFr(quote.preferredDate, tz)
      : null,
    receivedLabel: `${formatLongDateFr(quote.createdAt, tz)} à ${formatLocalTime(quote.createdAt, tz)}`,
    status: quote.status,
    attachmentUrl: quote.attachmentKey ? `/api/media/${quote.attachmentKey}` : null,
    whatsappUrl: whatsappFor(quote.customerPhone, quote.customerName, provider.businessName),
    estimateLabel:
      quote.estimateMin !== null && quote.estimateMax !== null
        ? quote.estimateMin === quote.estimateMax
          ? money(quote.estimateMin)
          : `${money(quote.estimateMin)} – ${money(quote.estimateMax)}`
        : null,
    estimateDurationLabel: quote.estimateMinutes
      ? formatDurationFr(quote.estimateMinutes)
      : null,
    estimateAnswers: parseEstimateAnswers(quote.estimateAnswers),
  }));

  // What the cheapest possible request would announce, so the provider sees
  // the floor of her own configuration without leaving the page.
  const sample = config ? computeEstimate(config, cheapestAnswers(config)) : null;
  const sampleRange =
    sample && sample.complete
      ? sample.min === sample.max
        ? money(sample.total)
        : `${money(sample.min)} – ${money(sample.max)}`
      : null;

  return (
    <>
      <Section
        title="Demandes reçues"
        description={
          rows.length > 0
            ? "L'estimation affichée à la cliente est rappelée sur chaque demande."
            : undefined
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="Aucune demande de devis"
            description="Activez la section « Demande de devis » sur votre site pour commencer à en recevoir."
          />
        ) : (
          <QuoteList quotes={rows} />
        )}
      </Section>

      <Section
        title="Configurer l'estimation"
        description="Un prix de départ, puis des questions dont les réponses ajoutent un montant. La cliente voit la fourchette bouger pendant qu'elle répond."
      >
        <QuoteEstimatorConfig
          currencyLabel={provider.currency === "XOF" ? "FCFA" : provider.currency}
          sampleRange={sampleRange}
          settings={{
            estimatorEnabled: settings?.estimatorEnabled ?? false,
            basePrice: settings?.basePrice ?? 0,
            baseDurationMinutes: settings?.baseDurationMinutes ?? 60,
            marginPercent: settings?.marginPercent ?? 15,
            intro: settings?.intro ?? "",
            disclaimer: settings?.disclaimer ?? "",
          }}
          questions={(settings?.questions ?? []).map((question) => ({
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
          }))}
        />
      </Section>
    </>
  );
}

/** Pick the cheapest option of every required question. */
function cheapestAnswers(
  config: NonNullable<Awaited<ReturnType<typeof loadEstimatorConfig>>>,
): Record<string, string[]> {
  const answers: Record<string, string[]> = {};

  for (const question of config.questions) {
    if (!question.required) continue;
    const cheapest = [...question.options].sort(
      (a, b) => a.priceAdjustment - b.priceAdjustment,
    )[0];
    if (cheapest) answers[question.id] = [cheapest.id];
  }

  return answers;
}

/**
 * A prefilled WhatsApp reply. The customer gave this number herself when
 * asking for a quote, so answering there is the fastest route.
 */
function whatsappFor(
  phone: string,
  customerName: string,
  businessName: string,
): string | null {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 6) return null;

  const message = `Bonjour ${customerName}, c'est ${businessName}. Je fais suite à votre demande de devis.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
