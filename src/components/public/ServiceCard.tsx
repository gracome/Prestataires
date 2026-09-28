import Link from "next/link";

/**
 * A prestation, told by its photograph.
 *
 * The picture is the card, not an illustration sitting on top of one. Most
 * visitors do not know trade names like "remplissage gel" or "semi-permanent";
 * the photo carries the meaning before a single word is read, and the price
 * sits above the name because it is the second thing anyone wants to know.
 *
 * Everything is laid over the image behind a gradient dark enough to hold
 * white text whatever photo the provider uploads — a scrim tuned to one
 * picture fails on the next one.
 */

export type ServiceCardData = {
  slug: string;
  name: string;
  shortDescription: string | null;
  imageUrl: string | null;
  priceLabel: string;
  durationLabel: string;
  depositLabel: string | null;
  popular: boolean;
  quoteOnly: boolean;
  stepCount: number;
};

export function ServiceCard({
  service,
  providerSlug,
  index,
}: {
  service: ServiceCardData;
  providerSlug: string;
  /** Position in the list, drawn large and faint over the photograph. */
  index?: number;
  /** Kept for call-site compatibility; the card always leads to the detail. */
  bookingOpen?: boolean;
}) {
  const detailHref = `/${providerSlug}/prestations/${service.slug}`;

  return (
    <article className="photo-card">
      <Link href={detailHref} className="photo-card-link">
        {service.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={service.imageUrl} alt="" loading="lazy" className="photo-card-img" />
        ) : (
          <span aria-hidden="true" className="photo-card-fallback" />
        )}

        <span className="photo-card-scrim" aria-hidden="true" />

        {index !== undefined ? (
          <span className="photo-card-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}

        <span className="photo-card-body">
          <span className="photo-card-meta">
            {service.quoteOnly ? "Sur devis" : `À partir de ${service.priceLabel}`}
            {service.popular ? <span className="photo-card-star"> · Populaire</span> : null}
          </span>

          <span className="photo-card-title">{service.name}</span>

          {service.shortDescription ? (
            <span className="photo-card-desc">{service.shortDescription}</span>
          ) : null}
        </span>

        <span className="photo-card-foot">
          <span className="photo-card-arrow" aria-hidden="true">
            ↗
          </span>
          <span className="photo-card-duration">{service.durationLabel}</span>
        </span>
      </Link>
    </article>
  );
}
export function ServiceImage({
  url,
  name,
  ratio = "4 / 3",
}: {
  url: string | null;
  name: string;
  ratio?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        loading="lazy"
        decoding="async"
        style={{
          display: "block",
          width: "100%",
          aspectRatio: ratio,
          objectFit: "cover",
          background: "color-mix(in srgb, var(--brand-accent) 30%, var(--brand-surface))",
        }}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        aspectRatio: ratio,
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--brand-accent) 55%, var(--brand-surface)), color-mix(in srgb, var(--brand-primary) 25%, var(--brand-surface)))",
        color: "var(--brand-primary)",
        fontFamily: "var(--font-heading)",
        fontSize: "2rem",
        fontWeight: 600,
        letterSpacing: ".04em",
      }}
    >
      {initials}
    </div>
  );
}
