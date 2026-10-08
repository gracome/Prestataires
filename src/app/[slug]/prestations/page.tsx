import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicSite,
  getPublicSiteOrNotFound,
  serviceFamilies,
  bookingSubscribed,
} from "@/lib/providers/public-site";
import { toServiceCard } from "@/lib/providers/service-card";
import { FamilyCard } from "@/components/public/FamilyCard";
import { ServiceMenu } from "@/components/public/ServiceMenu";
import { appUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublicSite(slug);
  if (!site) return { title: "Page introuvable" };

  const title = `Prestations et tarifs — ${site.businessName}`;
  const description =
    site.siteSettings?.servicesIntro?.trim() ||
    `Toutes les prestations de ${site.businessName}${site.city ? ` à ${site.city}` : ""} : durée, tarif et déroulé détaillé.`;

  return {
    title,
    description,
    alternates: { canonical: appUrl(`/${site.slug}/prestations`) },
    openGraph: { title, description, type: "website" },
  };
}

export default async function ServicesCataloguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublicSiteOrNotFound(slug);

  const showPrices = site.siteSettings?.showPricing !== false;
  const bookingOpen =
    bookingSubscribed(site) &&
    (site.siteSettings?.showBooking ?? true) &&
    (site.bookingSettings?.bookingEnabled ?? true);

  // Two trades or more open on the trades; a single one goes straight to its
  // price list, since a page holding one card would be a click for nothing.
  const families = serviceFamilies(site);

  return (
    <div style={{ paddingBlock: "2.5rem 4rem" }}>
      <div className="container">
        <p className="eyebrow">Prestations</p>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2rem, 6vw, 3rem)",
            margin: ".4rem 0 1rem",
            letterSpacing: "-0.02em",
          }}
        >
          Ce que je propose
        </h1>
        <p
          style={{
            color: "var(--brand-muted)",
            lineHeight: 1.75,
            maxWidth: 620,
            fontSize: "1.02rem",
            margin: "0 0 2.5rem",
          }}
        >
          {site.siteSettings?.servicesIntro?.trim() ||
            "Pas besoin de connaître le nom exact. Regardez les photos, ouvrez la fiche qui vous parle : vous y trouverez le déroulé complet, la durée réelle et ce qui est compris dans le prix."}
        </p>

        {site.services.length === 0 ? (
          <p className="card" style={{ color: "var(--brand-muted)" }}>
            Aucune prestation n&apos;est publiée pour le moment.
          </p>
        ) : families.length > 1 ? (
          <ul
            className="family-grid"
            style={{ "--family-count": Math.min(families.length, 4) } as React.CSSProperties}
          >
            {families.map((family) => (
              <li key={family.slug}>
                <FamilyCard
                  href={`/${site.slug}/prestations/categorie/${family.slug}`}
                  name={family.name}
                  description={family.description}
                  imageUrl={family.imageUrl}
                  count={family.services.length}
                  fromLabel={
                    showPrices && family.fromPrice !== null
                      ? formatMoney(family.fromPrice, site.currency, site.locale)
                      : null
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <ServiceMenu
            providerSlug={site.slug}
            bookingOpen={bookingOpen}
            services={site.services.map((service) =>
              toServiceCard(service, {
                currency: site.currency,
                locale: site.locale,
                showPrices,
              }),
            )}
          />
        )}

        <div
          className="card"
          style={{
            marginTop: "3rem",
            padding: "1.75rem 1.5rem",
            background:
              "linear-gradient(140deg, color-mix(in srgb, var(--brand-accent) 28%, var(--brand-surface)), var(--brand-surface))",
          }}
        >
          <h2 className="font-display" style={{ fontSize: "1.3rem", margin: "0 0 .5rem" }}>
            Vous hésitez entre deux prestations ?
          </h2>
          <p style={{ margin: "0 0 1.25rem", color: "var(--brand-muted)", lineHeight: 1.7, maxWidth: 520 }}>
            Décrivez ce que vous souhaitez et {site.ownerName.split(" ")[0]} vous
            orientera vers ce qui convient le mieux.
          </p>
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
            {site.siteSettings?.showQuoteRequest ? (
              <Link href={`/${site.slug}/devis`} className="btn btn-primary">
                Demander un devis
              </Link>
            ) : null}
            <Link href={`/${site.slug}#contact`} className="btn btn-secondary">
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
