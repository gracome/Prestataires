import type { PublicSite } from "@/lib/providers/public-site";
import { appUrl } from "@/lib/env";
import { formatMinuteOfDay } from "@/lib/time";
import { toMajorUnits } from "@/lib/money";

/**
 * Structured data (cahier des charges section 25).
 *
 * A HealthAndBeautyBusiness node with opening hours, services and price range
 * so the site can surface rich results, plus an FAQPage node when the provider
 * has published questions.
 */

const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function LocalBusinessJsonLd({ site }: { site: PublicSite }) {
  const url = appUrl(`/${site.slug}`);

  const openingHours = site.workingHours
    .filter((wh) => wh.active)
    .map((wh) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[wh.dayOfWeek]}`,
      opens: formatMinuteOfDay(wh.openMinute),
      closes: formatMinuteOfDay(wh.closeMinute),
    }));

  const priced = site.services.filter(
    (service) => service.priceType !== "QUOTE_ONLY" && service.price > 0,
  );

  const prices = priced.map((service) => toMajorUnits(service.price, site.currency));

  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": url,
    name: site.businessName,
    url,
    description:
      site.siteSettings?.seoDescription || site.tagline || site.description || undefined,
    image: site.coverImageUrl || site.logoUrl || undefined,
    logo: site.logoUrl || undefined,
    email: site.email,
    telephone: site.phone || undefined,
    currenciesAccepted: site.currency,
    ...(site.addressLine || site.city
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: site.addressLine || undefined,
            addressLocality: site.city || undefined,
            addressCountry: site.country || undefined,
          },
        }
      : {}),
    ...(site.latitude != null && site.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: site.latitude,
            longitude: site.longitude,
          },
        }
      : {}),
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
    ...(prices.length > 0
      ? {
          priceRange: `${Math.min(...prices)} - ${Math.max(...prices)} ${site.currency}`,
        }
      : {}),
    ...(site.socialLinks.length > 0
      ? { sameAs: site.socialLinks.map((link) => link.url) }
      : {}),
    ...(site.services.length > 0
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Prestations",
            itemListElement: site.services.map((service) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: service.name,
                description: service.description || undefined,
              },
              ...(service.priceType === "QUOTE_ONLY"
                ? {}
                : {
                    price: toMajorUnits(service.price, site.currency),
                    priceCurrency: site.currency,
                  }),
            })),
          },
        }
      : {}),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: appUrl(`/${site.slug}/reservation`),
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "Reservation", name: "Rendez-vous" },
    },
  };

  const nodes: Array<Record<string, unknown>> = [business];

  if (site.faqItems.length > 0) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: site.faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return (
    <>
      {nodes.map((node, index) => (
        <script
          key={index}
          type="application/ld+json"
          // The payload is built from database values, not from markup, and
          // JSON.stringify escapes everything that could close the tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(node).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
