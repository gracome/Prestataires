import type { Metadata } from "next";
import { getPublicSite, getPublicSiteOrNotFound } from "@/lib/providers/public-site";
import { QuoteEstimator } from "@/components/booking/QuoteEstimator";
import { loadEstimatorConfig, loadQuoteTexts } from "@/lib/quotes/config";
import { submitQuoteRequest } from "./actions";
import type { ActionState } from "@/lib/validation";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublicSite(slug);
  if (!site) return { title: "Page introuvable" };

  return {
    title: `Estimer et demander un devis — ${site.businessName}`,
    description: `Estimez votre projet en quelques clics et recevez une proposition de ${site.businessName}.`,
    alternates: { canonical: appUrl(`/${site.slug}/devis`) },
    robots: { index: false, follow: true },
  };
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const { service } = await searchParams;
  const site = await getPublicSiteOrNotFound(slug);

  const [config, texts] = await Promise.all([
    loadEstimatorConfig(site.id),
    loadQuoteTexts(site.id),
  ]);

  // The action is bound to this provider on the server, so the slug cannot be
  // swapped by editing the form in the browser.
  const action = async (
    previous: ActionState,
    formData: FormData,
  ): Promise<ActionState> => {
    "use server";
    return submitQuoteRequest(site.slug, previous, formData);
  };

  const initialServiceId = service
    ? site.services.find((s) => s.slug === service || s.id === service)?.id
    : undefined;

  return (
    <div className="container-narrow" style={{ paddingBlock: "2.5rem 3.5rem" }}>
      <p className="eyebrow">Sur mesure</p>
      <h1
        className="font-display"
        style={{ fontSize: "clamp(1.9rem, 5.5vw, 2.6rem)", margin: ".35rem 0 .75rem" }}
      >
        {config ? "Estimez votre projet" : "Demander un devis"}
      </h1>
      <p style={{ color: "var(--brand-muted)", lineHeight: 1.75, marginBottom: "2rem" }}>
        {config
          ? `Quelques questions suffisent pour obtenir une fourchette de prix. ${site.ownerName.split(" ")[0]} confirme ensuite le tarif exact.`
          : `Décrivez votre projet en quelques lignes. ${site.ownerName.split(" ")[0]} vous répondra avec une proposition adaptée.`}
      </p>

      <QuoteEstimator
        config={config}
        services={site.services.map((s) => ({ id: s.id, name: s.name }))}
        initialServiceId={initialServiceId}
        currency={site.currency}
        locale={site.locale}
        intro={texts.intro}
        disclaimer={texts.disclaimer}
        ownerFirstName={site.ownerName.split(" ")[0]}
        action={action}
      />
    </div>
  );
}
