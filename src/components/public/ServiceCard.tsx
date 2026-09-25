import Link from "next/link";

/**
 * A prestation as a picture first.
 *
 * Most visitors do not know trade names like "remplissage gel" or
 * "semi-permanent". The photo carries the meaning, the plain sentence under
 * the title confirms it, and the price and duration answer the next question
 * without a click.
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
  bookingOpen,
}: {
  service: ServiceCardData;
  providerSlug: string;
  bookingOpen: boolean;
}) {
  const detailHref = `/${providerSlug}/prestations/${service.slug}`;

  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--brand-surface)",
        border: "1px solid var(--brand-border)",
        borderRadius: 18,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <Link
        href={detailHref}
        style={{ display: "block", position: "relative", textDecoration: "none" }}
      >
        <ServiceImage url={service.imageUrl} name={service.name} />

        {service.popular ? (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "var(--brand-surface)",
              color: "var(--brand-text)",
              borderRadius: 999,
              padding: ".28rem .7rem",
              fontSize: ".72rem",
              fontWeight: 700,
              letterSpacing: ".02em",
            }}
          >
            Le plus demandé
          </span>
        ) : null}
      </Link>

      <div
        style={{
          padding: "1.1rem 1.15rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: ".55rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3 }}>
            <Link
              href={detailHref}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {service.name}
            </Link>
          </h3>

          {service.shortDescription ? (
            <p
              style={{
                margin: ".35rem 0 0",
                fontSize: ".9rem",
                lineHeight: 1.6,
                color: "var(--brand-muted)",
              }}
            >
              {service.shortDescription}
            </p>
          ) : null}
        </div>

        <ul
          style={{
            listStyle: "none",
            margin: "auto 0 0",
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: ".4rem",
            paddingTop: ".35rem",
          }}
        >
          <Chip>{service.durationLabel}</Chip>
          <Chip strong>{service.priceLabel}</Chip>
          {service.depositLabel ? (
            <Chip>acompte {service.depositLabel}</Chip>
          ) : null}
        </ul>

        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".5rem" }}>
          <Link
            href={detailHref}
            className="btn btn-secondary"
            style={compactButton}
          >
            {service.stepCount > 0 ? "Voir le déroulé" : "En savoir plus"}
          </Link>

          {!service.quoteOnly && bookingOpen ? (
            <Link
              href={`/${providerSlug}/reservation?service=${service.slug}`}
              className="btn btn-primary"
              style={compactButton}
            >
              Réserver
            </Link>
          ) : service.quoteOnly ? (
            <Link
              href={`/${providerSlug}/devis`}
              className="btn btn-primary"
              style={compactButton}
            >
              Demander un devis
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * The photo, or a warm placeholder built from the prestation's initials when
 * the provider has not uploaded one yet. An empty grey box would make a new
 * site look broken.
 */
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

function Chip({
  children,
  strong,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <li
      style={{
        fontSize: ".78rem",
        fontWeight: strong ? 700 : 500,
        padding: ".25rem .6rem",
        borderRadius: 999,
        background: strong
          ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
          : "color-mix(in srgb, var(--brand-text) 6%, transparent)",
        color: strong ? "var(--brand-primary)" : "var(--brand-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </li>
  );
}

const compactButton: React.CSSProperties = {
  padding: ".5rem 1rem",
  minHeight: 40,
  fontSize: ".85rem",
};
