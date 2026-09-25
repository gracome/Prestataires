import type { Metadata } from "next";
import { getPublicSite, getPublicSiteOrNotFound } from "@/lib/providers/public-site";
import { googleFontsHref, themeStyle } from "@/lib/theme";
import { SiteHeader, type NavItem } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { appUrl } from "@/lib/env";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublicSite(slug);

  if (!site) return { title: "Page introuvable" };

  const title =
    site.siteSettings?.seoTitle?.trim() ||
    `${site.businessName}${site.city ? ` — ${site.city}` : ""}`;

  const description =
    site.siteSettings?.seoDescription?.trim() ||
    site.tagline ||
    site.description?.slice(0, 160) ||
    `Réservez en ligne chez ${site.businessName}.`;

  const image = site.siteSettings?.ogImageUrl || site.coverImageUrl || site.logoUrl;
  const canonical = appUrl(`/${site.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: site.businessName,
      locale: "fr_FR",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProviderSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const site = await getPublicSiteOrNotFound(slug);

  const settings = site.siteSettings;
  const bookingEnabled =
    (settings?.showBooking ?? true) &&
    (site.bookingSettings?.bookingEnabled ?? true) &&
    site.services.some((service) => service.priceType !== "QUOTE_ONLY");

  // Prestations and réalisations are real pages now, so they lead the menu.
  // The remaining entries stay as anchors on the home page.
  const nav: NavItem[] = [
    settings?.showServices !== false && site.services.length > 0
      ? { href: `/${site.slug}/prestations`, label: "Prestations" }
      : null,
    settings?.showRealisations !== false && site.galleryImages.length > 0
      ? { href: `/${site.slug}/realisations`, label: "Réalisations" }
      : null,
    settings?.showAbout !== false
      ? { href: `/${site.slug}#a-propos`, label: "À propos" }
      : null,
    settings?.showHours !== false
      ? { href: `/${site.slug}#horaires`, label: "Horaires" }
      : null,
    settings?.showFaq !== false && site.faqItems.length > 0
      ? { href: `/${site.slug}#faq`, label: "FAQ" }
      : null,
    settings?.showContact !== false
      ? { href: `/${site.slug}#contact`, label: "Contact" }
      : null,
  ].filter((item): item is NavItem => item !== null);

  const fontsHref = googleFontsHref(site.theme);

  return (
    <div style={themeStyle(site.theme)}>
      {fontsHref ? (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} />
        </>
      ) : null}

      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>

      <SiteHeader
        businessName={site.businessName}
        logoUrl={site.logoUrl}
        homeHref={`/${site.slug}`}
        bookingHref={`/${site.slug}/reservation`}
        nav={nav}
        bookingEnabled={bookingEnabled}
      />

      <main id="contenu">{children}</main>

      <SiteFooter site={site} />
    </div>
  );
}
