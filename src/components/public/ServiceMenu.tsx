import Link from "next/link";
import type { ServiceCardData } from "./ServiceCard";

/**
 * A family's prestations, as a salon's price list.
 *
 * The portfolio is where photographs speak; here a visitor has already chosen
 * the trade and is comparing names, durations and prices, so they read down a
 * list rather than across a wall of pictures. A small thumbnail stays when
 * there is one, because it still tells "boho braids" from "knotless" faster
 * than the name does.
 */
export function ServiceMenu({
  services,
  providerSlug,
  bookingOpen,
}: {
  services: ServiceCardData[];
  providerSlug: string;
  bookingOpen: boolean;
}) {
  return (
    <ul className="service-menu">
      {services.map((service) => {
        const detailHref = `/${providerSlug}/prestations/${service.slug}`;
        return (
          <li key={service.slug} className="service-menu-row">
            <Link href={detailHref} className="service-menu-main">
              {service.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={service.imageUrl} alt="" loading="lazy" className="service-menu-thumb" />
              ) : null}
              <span className="service-menu-text">
                <span className="service-menu-name">
                  {service.name}
                  {service.popular ? <span className="service-menu-star">Populaire</span> : null}
                </span>
                {service.shortDescription ? (
                  <span className="service-menu-desc">{service.shortDescription}</span>
                ) : null}
                <span className="service-menu-duration">{service.durationLabel}</span>
              </span>
            </Link>

            <span className="service-menu-side">
              <span className="service-menu-price">{service.priceLabel}</span>
              {bookingOpen && !service.quoteOnly ? (
                <Link
                  href={`/${providerSlug}/reservation?service=${service.slug}`}
                  className="btn btn-primary service-menu-book"
                >
                  Réserver
                </Link>
              ) : (
                <Link href={detailHref} className="btn btn-secondary service-menu-book">
                  Détails
                </Link>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
