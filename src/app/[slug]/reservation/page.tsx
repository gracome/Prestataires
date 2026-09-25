import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSiteOrNotFound } from "@/lib/providers/public-site";
import { BookingFlow, type FlowService } from "@/components/booking/BookingFlow";
import { computeDeposit, formatMoney } from "@/lib/money";
import { formatDurationFr, toLocalDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublicSiteOrNotFound(slug);

  return {
    title: `Prendre rendez-vous — ${site.businessName}`,
    description: `Réservez votre créneau en ligne chez ${site.businessName}.`,
    // A booking form has nothing to rank on and should not compete with the
    // provider's home page in search results.
    robots: { index: false, follow: true },
  };
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const { service: requestedService } = await searchParams;
  const site = await getPublicSiteOrNotFound(slug);

  const bookingOpen =
    (site.siteSettings?.showBooking ?? true) &&
    (site.bookingSettings?.bookingEnabled ?? true);

  const bookable = site.services.filter((s) => s.priceType !== "QUOTE_ONLY");

  if (!bookingOpen || bookable.length === 0) {
    return (
      <div className="container-narrow" style={{ paddingBlock: "3rem" }}>
        <h1 className="font-display" style={{ fontSize: "1.6rem" }}>
          Réservation en ligne indisponible
        </h1>
        <p style={{ color: "var(--brand-muted)", lineHeight: 1.7 }}>
          La prise de rendez-vous en ligne est momentanément fermée. Contactez
          directement {site.businessName} pour convenir d&apos;un créneau.
        </p>
        <Link href={`/${site.slug}#contact`} className="btn btn-primary">
          Voir les moyens de contact
        </Link>
      </div>
    );
  }

  const services: FlowService[] = bookable.map((service) => {
    const deposit = computeDeposit(service.price, {
      depositRequired: service.depositRequired,
      depositType: service.depositType,
      depositValue: service.depositValue,
    });

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category?.name ?? null,
      durationLabel: formatDurationFr(service.durationMinutes),
      priceLabel:
        service.priceType === "STARTING_FROM"
          ? `à partir de ${formatMoney(service.price, site.currency, site.locale)}`
          : formatMoney(service.price, site.currency, site.locale),
      depositLabel:
        deposit > 0 ? formatMoney(deposit, site.currency, site.locale) : null,
      depositRequired: deposit > 0,
    };
  });

  // Links from the catalogue carry the readable slug; older links and the
  // dashboard carry the id. Both resolve to the same prestation.
  const preselected = requestedService
    ? bookable.find(
        (s) => s.slug === requestedService || s.id === requestedService,
      )
    : undefined;
  const initialServiceId = preselected?.id;

  return (
    <BookingFlow
      slug={site.slug}
      services={services}
      initialServiceId={initialServiceId}
      today={toLocalDate(new Date(), site.timezone)}
      settings={{
        requireCustomerEmail: site.bookingSettings?.requireCustomerEmail ?? true,
        bookingTerms: site.bookingSettings?.bookingTerms ?? null,
        cancellationPolicy: site.bookingSettings?.cancellationPolicy ?? null,
        holdDurationMinutes: site.bookingSettings?.holdDurationMinutes ?? 30,
      }}
    />
  );
}
