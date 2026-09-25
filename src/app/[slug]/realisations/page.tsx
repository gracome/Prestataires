import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  galleryCategories,
  getPublicSite,
  getPublicSiteOrNotFound,
  whatsappLink,
} from "@/lib/providers/public-site";
import { PortfolioGrid, type PortfolioItem } from "@/components/public/PortfolioGrid";
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

  const title = `Réalisations — ${site.businessName}`;
  const description =
    site.siteSettings?.realisationsIntro?.trim() ||
    `Les réalisations de ${site.businessName}${site.city ? ` à ${site.city}` : ""}.`;

  const first = site.galleryImages[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: appUrl(`/${site.slug}/realisations`) },
    openGraph: {
      title,
      description,
      type: "website",
      images: first ? [{ url: first }] : undefined,
    },
  };
}

export default async function RealisationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublicSiteOrNotFound(slug);

  if (site.siteSettings?.showRealisations === false) notFound();

  const services = new Map(site.services.map((s) => [s.id, s]));

  const items: PortfolioItem[] = site.galleryImages.map((image) => {
    const service = image.serviceId ? services.get(image.serviceId) : undefined;
    return {
      id: image.id,
      url: image.url,
      caption: image.caption,
      category: image.category?.name ?? null,
      serviceName: service?.name ?? null,
      serviceSlug: service?.slug ?? null,
    };
  });

  const categories = galleryCategories(site.galleryImages).map((c) => c.name);
  const whatsapp = whatsappLink(
    site,
    "Bonjour, j'ai vu vos réalisations et j'aimerais un rendu similaire.",
  );

  return (
    <div style={{ paddingBlock: "2.5rem 4rem" }}>
      <div className="container">
        <p className="eyebrow">Vitrine</p>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2rem, 6vw, 3rem)",
            margin: ".4rem 0 1rem",
            letterSpacing: "-0.02em",
          }}
        >
          Réalisations
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
          {site.siteSettings?.realisationsIntro?.trim() ||
            `Chaque photo est un travail réalisé chez ${site.businessName}. Touchez une image pour l'agrandir, et suivez le lien vers la prestation correspondante pour la réserver.`}
        </p>

        {items.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <p className="font-display" style={{ margin: 0, fontSize: "1.2rem" }}>
              La vitrine se remplit bientôt
            </p>
            <p
              style={{
                margin: ".6rem auto 1.5rem",
                color: "var(--brand-muted)",
                lineHeight: 1.7,
                maxWidth: 420,
              }}
            >
              Aucune réalisation n&apos;est encore publiée. En attendant, les
              prestations sont détaillées étape par étape.
            </p>
            <Link href={`/${site.slug}/prestations`} className="btn btn-primary">
              Voir les prestations
            </Link>
          </div>
        ) : (
          <PortfolioGrid items={items} categories={categories} providerSlug={site.slug} />
        )}

        {items.length > 0 ? (
          <div
            className="card"
            style={{
              marginTop: "3rem",
              padding: "1.75rem 1.5rem",
              display: "flex",
              gap: "1.25rem",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              background:
                "linear-gradient(140deg, color-mix(in srgb, var(--brand-accent) 26%, var(--brand-surface)), var(--brand-surface))",
            }}
          >
            <div>
              <p className="font-display" style={{ margin: 0, fontSize: "1.25rem" }}>
                Un rendu vous plaît ?
              </p>
              <p style={{ margin: ".35rem 0 0", color: "var(--brand-muted)", fontSize: ".92rem" }}>
                Réservez la prestation correspondante, ou envoyez la photo en message.
              </p>
            </div>
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <Link href={`/${site.slug}/reservation`} className="btn btn-primary">
                Prendre rendez-vous
              </Link>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
