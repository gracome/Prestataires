import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicSite,
  getPublicSiteOrNotFound,
  groupServicesByCategory,
} from "@/lib/providers/public-site";
import { toServiceCard } from "@/lib/providers/service-card";
import { ServiceCard } from "@/components/public/ServiceCard";
import { appUrl } from "@/lib/env";

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
    (site.siteSettings?.showBooking ?? true) &&
    (site.bookingSettings?.bookingEnabled ?? true);

  const groups = groupServicesByCategory(site.services);

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
        ) : (
          <div style={{ display: "grid", gap: "3rem" }}>
            {groups.map((group) => (
              <section key={group.category?.id ?? "sans-categorie"}>
                {group.category ? (
                  <h2
                    className="font-display"
                    style={{ fontSize: "1.4rem", margin: "0 0 1.15rem" }}
                  >
                    {group.category.name}
                  </h2>
                ) : null}

                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: "1rem",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                  }}
                >
                  {group.services.map((service) => (
                    <li key={service.id}>
                      <ServiceCard
                        providerSlug={site.slug}
                        bookingOpen={bookingOpen}
                        service={toServiceCard(service, {
                          currency: site.currency,
                          locale: site.locale,
                          showPrices,
                        })}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
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
