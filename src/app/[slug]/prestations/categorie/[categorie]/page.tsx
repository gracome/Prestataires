import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookingSubscribed,
  getPublicSite,
  getPublicSiteOrNotFound,
  serviceFamilies,
} from "@/lib/providers/public-site";
import { toServiceCard } from "@/lib/providers/service-card";
import { ServiceMenu } from "@/components/public/ServiceMenu";
import { appUrl } from "@/lib/env";

export const revalidate = 60;

type Params = Promise<{ slug: string; categorie: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, categorie } = await params;
  const site = await getPublicSite(slug);
  if (!site) return { title: "Page introuvable" };

  const family = serviceFamilies(site).find((f) => f.slug === categorie);
  if (!family) return { title: "Page introuvable" };

  const title = `${family.name} · ${site.businessName}`;
  const description =
    family.description?.trim() ||
    `${family.name} chez ${site.businessName}${site.city ? ` à ${site.city}` : ""} : prestations, durées et tarifs.`;

  return {
    title,
    description,
    alternates: { canonical: appUrl(`/${site.slug}/prestations/categorie/${family.slug}`) },
    openGraph: {
      title,
      description,
      type: "website",
      images: family.imageUrl ? [{ url: family.imageUrl }] : undefined,
    },
  };
}

export default async function ServiceFamilyPage({ params }: { params: Params }) {
  const { slug, categorie } = await params;
  const site = await getPublicSiteOrNotFound(slug);

  const families = serviceFamilies(site);
  const family = families.find((f) => f.slug === categorie);
  if (!family) notFound();

  const showPrices = site.siteSettings?.showPricing !== false;
  const bookingOpen =
    bookingSubscribed(site) &&
    (site.siteSettings?.showBooking ?? true) &&
    (site.bookingSettings?.bookingEnabled ?? true);

  return (
    <div style={{ paddingBlock: "2.5rem 4rem" }}>
      <div className="container" style={{ maxWidth: 860 }}>
        <Link
          href={`/${site.slug}/prestations`}
          style={{ color: "var(--brand-muted)", fontSize: ".9rem", textDecoration: "none" }}
        >
          ← Toutes les prestations
        </Link>

        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2rem, 6vw, 3rem)",
            margin: "1rem 0 .75rem",
            letterSpacing: "-0.02em",
          }}
        >
          {family.name}
        </h1>
        {family.description ? (
          <p
            style={{
              color: "var(--brand-muted)",
              lineHeight: 1.75,
              maxWidth: 620,
              fontSize: "1.02rem",
              margin: "0 0 1.75rem",
            }}
          >
            {family.description}
          </p>
        ) : null}

        {families.length > 1 ? (
          <nav aria-label="Familles de prestations" className="family-tabs">
            {families.map((f) => (
              <Link
                key={f.slug}
                href={`/${site.slug}/prestations/categorie/${f.slug}`}
                className="family-tab"
                aria-current={f.slug === family.slug ? "page" : undefined}
              >
                {f.name}
              </Link>
            ))}
          </nav>
        ) : null}

        <ServiceMenu
          providerSlug={site.slug}
          bookingOpen={bookingOpen}
          services={family.services.map((service) =>
            toServiceCard(service, {
              currency: site.currency,
              locale: site.locale,
              showPrices,
            }),
          )}
        />
      </div>
    </div>
  );
}
