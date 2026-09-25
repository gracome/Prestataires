import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicSite,
  getPublicSiteOrNotFound,
  getServiceOrNotFound,
  whatsappLink,
  type PublicSite,
  type ShowcaseService,
} from "@/lib/providers/public-site";
import { computeDeposit, formatMoney, toMajorUnits } from "@/lib/money";
import { formatDurationFr } from "@/lib/time";
import { ServiceImage } from "@/components/public/ServiceCard";
import { appUrl } from "@/lib/env";

export const revalidate = 60;

type Params = { slug: string; service: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, service: serviceSlug } = await params;
  const site = await getPublicSite(slug);
  if (!site) return { title: "Page introuvable" };

  const service = site.services.find((s) => s.slug === serviceSlug);
  if (!service) return { title: "Prestation introuvable" };

  const title = `${service.name} — ${site.businessName}`;
  const description =
    service.shortDescription?.trim() ||
    service.description?.slice(0, 160) ||
    `${service.name} en ${formatDurationFr(service.durationMinutes)} chez ${site.businessName}.`;

  return {
    title,
    description,
    alternates: { canonical: appUrl(`/${site.slug}/prestations/${service.slug}`) },
    openGraph: {
      title,
      description,
      type: "article",
      images: service.imageUrl ? [{ url: service.imageUrl }] : undefined,
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, service: serviceSlug } = await params;
  const site = await getPublicSiteOrNotFound(slug);
  const service = await getServiceOrNotFound(site, serviceSlug);

  const showPrices = site.siteSettings?.showPricing !== false;
  const quoteOnly = service.priceType === "QUOTE_ONLY";
  const bookingOpen =
    (site.siteSettings?.showBooking ?? true) &&
    (site.bookingSettings?.bookingEnabled ?? true) &&
    !quoteOnly;

  const deposit = computeDeposit(service.price, {
    depositRequired: service.depositRequired,
    depositType: service.depositType,
    depositValue: service.depositValue,
  });

  const totalMinutes = service.steps.reduce(
    (sum, step) => sum + (step.durationMinutes ?? 0),
    0,
  );

  return (
    <div>
      <ServiceJsonLd site={site} service={service} />

      <nav
        aria-label="Fil d'Ariane"
        className="container"
        style={{ paddingBlock: "1.25rem .5rem", fontSize: ".85rem", color: "var(--brand-muted)" }}
      >
        <Link href={`/${site.slug}`} style={crumbStyle}>
          Accueil
        </Link>
        <span aria-hidden="true" style={{ margin: "0 .4rem" }}>
          ›
        </span>
        <Link href={`/${site.slug}/prestations`} style={crumbStyle}>
          Prestations
        </Link>
        <span aria-hidden="true" style={{ margin: "0 .4rem" }}>
          ›
        </span>
        <span style={{ color: "var(--brand-text)" }}>{service.name}</span>
      </nav>

      <div className="container" style={{ paddingBottom: "4rem" }}>
        <div
          style={{
            display: "grid",
            gap: "2rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            alignItems: "start",
            marginBottom: "3rem",
          }}
        >
          <div style={{ borderRadius: 20, overflow: "hidden" }}>
            <ServiceImage url={service.imageUrl} name={service.name} ratio="4 / 3" />
          </div>

          <div>
            {service.category ? <p className="eyebrow">{service.category.name}</p> : null}

            <h1
              className="font-display"
              style={{
                fontSize: "clamp(1.9rem, 5.5vw, 2.8rem)",
                margin: ".35rem 0 .85rem",
                letterSpacing: "-0.02em",
              }}
            >
              {service.name}
            </h1>

            {service.shortDescription ? (
              <p
                style={{
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  color: "var(--brand-muted)",
                  margin: "0 0 1.5rem",
                }}
              >
                {service.shortDescription}
              </p>
            ) : null}

            <dl
              style={{
                display: "grid",
                gap: ".75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                margin: "0 0 1.5rem",
                padding: "1.1rem 1.15rem",
                background: "var(--brand-surface)",
                border: "1px solid var(--brand-border)",
                borderRadius: 16,
              }}
            >
              <Fact label="Durée" value={formatDurationFr(service.durationMinutes)} />
              {showPrices ? (
                <Fact
                  label="Tarif"
                  value={
                    quoteOnly
                      ? "Sur devis"
                      : `${service.priceType === "STARTING_FROM" ? "dès " : ""}${formatMoney(service.price, site.currency, site.locale)}`
                  }
                  strong
                />
              ) : null}
              {showPrices && deposit > 0 ? (
                <Fact
                  label="Acompte"
                  value={formatMoney(deposit, site.currency, site.locale)}
                />
              ) : null}
            </dl>

            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              {bookingOpen ? (
                <Link
                  href={`/${site.slug}/reservation?service=${service.slug}`}
                  className="btn btn-primary"
                >
                  Réserver cette prestation
                </Link>
              ) : quoteOnly ? (
                <Link href={`/${site.slug}/devis?service=${service.slug}`} className="btn btn-primary">
                  Demander un devis
                </Link>
              ) : null}

              {whatsappLink(site, `Bonjour, j'aimerais des informations sur la prestation « ${service.name} ».`) ? (
                <a
                  href={
                    whatsappLink(
                      site,
                      `Bonjour, j'aimerais des informations sur la prestation « ${service.name} ».`,
                    ) as string
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Poser une question
                </a>
              ) : null}
            </div>

            {deposit > 0 ? (
              <p style={{ marginTop: "1rem", fontSize: ".85rem", color: "var(--brand-muted)", lineHeight: 1.6 }}>
                Un acompte de {formatMoney(deposit, site.currency, site.locale)} confirme
                votre créneau. Le solde de{" "}
                {formatMoney(service.price - deposit, site.currency, site.locale)} se règle
                sur place.
              </p>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "2.5rem",
            gridTemplateColumns: "minmax(0, 1fr)",
            maxWidth: 760,
          }}
        >
          {service.description ? (
            <Block title="En quoi ça consiste">
              <div className="prose-sm">
                {service.description.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </Block>
          ) : null}

          {service.idealFor ? (
            <Block title="Idéal pour vous si">
              <BulletList text={service.idealFor} />
            </Block>
          ) : null}

          {service.steps.length > 0 ? (
            <Block
              title="Le déroulé, étape par étape"
              subtitle={
                totalMinutes > 0
                  ? `Environ ${formatDurationFr(totalMinutes)} au total, hors temps d'échange.`
                  : undefined
              }
            >
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1rem" }}>
                {service.steps.map((step, index) => (
                  <li
                    key={step.id}
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: step.imageUrl ? "auto 1fr" : "auto 1fr",
                      alignItems: "start",
                      padding: "1.1rem",
                      background: "var(--brand-surface)",
                      border: "1px solid var(--brand-border)",
                      borderRadius: 16,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="font-display"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "color-mix(in srgb, var(--brand-primary) 14%, transparent)",
                        color: "var(--brand-primary)",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </span>

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          display: "flex",
                          gap: ".6rem",
                          alignItems: "baseline",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className="visually-hidden">Étape {index + 1} :</span>
                        {step.title}
                        {step.durationMinutes ? (
                          <span
                            style={{
                              fontSize: ".75rem",
                              fontWeight: 600,
                              color: "var(--brand-muted)",
                              background: "color-mix(in srgb, var(--brand-text) 6%, transparent)",
                              padding: ".15rem .55rem",
                              borderRadius: 999,
                            }}
                          >
                            {formatDurationFr(step.durationMinutes)}
                          </span>
                        ) : null}
                      </p>

                      {step.description ? (
                        <p
                          style={{
                            margin: ".45rem 0 0",
                            lineHeight: 1.7,
                            color: "var(--brand-muted)",
                            fontSize: ".93rem",
                          }}
                        >
                          {step.description}
                        </p>
                      ) : null}

                      {step.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={step.imageUrl}
                          alt=""
                          loading="lazy"
                          style={{
                            marginTop: ".8rem",
                            width: "100%",
                            maxWidth: 320,
                            aspectRatio: "3 / 2",
                            objectFit: "cover",
                            borderRadius: 12,
                            display: "block",
                          }}
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </Block>
          ) : null}

          {service.included ? (
            <Block title="Ce qui est compris">
              <BulletList text={service.included} check />
            </Block>
          ) : null}

          {service.preparation ? (
            <Block title="Comment vous préparer">
              <BulletList text={service.preparation} />
            </Block>
          ) : null}

          {service.aftercare ? (
            <Block title="Après la prestation">
              <BulletList text={service.aftercare} />
            </Block>
          ) : null}

          {service.galleryImages.length > 0 ? (
            <Block title="Quelques rendus">
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gap: ".7rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))",
                }}
              >
                {service.galleryImages.map((image) => (
                  <li key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.caption ?? service.name}
                      loading="lazy"
                      style={{
                        display: "block",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        borderRadius: 12,
                      }}
                    />
                    {image.caption ? (
                      <p style={{ margin: ".4rem 0 0", fontSize: ".8rem", color: "var(--brand-muted)" }}>
                        {image.caption}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
        </div>

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
              Prête pour {service.name.toLowerCase()} ?
            </p>
            <p style={{ margin: ".35rem 0 0", color: "var(--brand-muted)", fontSize: ".92rem" }}>
              {formatDurationFr(service.durationMinutes)}
              {showPrices && !quoteOnly
                ? ` · ${formatMoney(service.price, site.currency, site.locale)}`
                : ""}
            </p>
          </div>

          {bookingOpen ? (
            <Link
              href={`/${site.slug}/reservation?service=${service.slug}`}
              className="btn btn-primary"
            >
              Choisir mon créneau
            </Link>
          ) : quoteOnly ? (
            <Link href={`/${site.slug}/devis?service=${service.slug}`} className="btn btn-primary">
              Demander un devis
            </Link>
          ) : null}
        </div>

        <p style={{ marginTop: "2rem" }}>
          <Link href={`/${site.slug}/prestations`} style={{ fontSize: ".9rem" }}>
            ← Voir toutes les prestations
          </Link>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Block({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display" style={{ fontSize: "1.45rem", margin: "0 0 .35rem" }}>
        {title}
      </h2>
      {subtitle ? (
        <p style={{ margin: "0 0 1rem", fontSize: ".88rem", color: "var(--brand-muted)" }}>
          {subtitle}
        </p>
      ) : (
        <div style={{ height: ".85rem" }} />
      )}
      {children}
    </section>
  );
}

/**
 * Providers type these fields as one line per point. Splitting on newlines
 * keeps the dashboard a plain textarea while the site still renders a list.
 */
function BulletList({ text, check }: { text: string; check?: boolean }) {
  const items = text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (items.length <= 1) {
    return (
      <p style={{ margin: 0, lineHeight: 1.75, color: "var(--brand-muted)" }}>{text}</p>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".55rem" }}>
      {items.map((item, index) => (
        <li
          key={index}
          style={{
            display: "flex",
            gap: ".65rem",
            alignItems: "baseline",
            lineHeight: 1.7,
            color: "var(--brand-muted)",
          }}
        >
          <span
            aria-hidden="true"
            style={{ color: "var(--brand-primary)", fontWeight: 700, flexShrink: 0 }}
          >
            {check ? "✓" : "—"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Fact({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt
        style={{
          fontSize: ".72rem",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--brand-muted)",
          fontWeight: 600,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: ".25rem 0 0",
          fontWeight: 700,
          fontSize: strong ? "1.15rem" : "1rem",
          color: strong ? "var(--brand-primary)" : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}

/** Schema.org Service node, so the prestation can surface on its own. */
function ServiceJsonLd({
  site,
  service,
}: {
  site: PublicSite;
  service: ShowcaseService;
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.shortDescription || service.description || undefined,
    image: service.imageUrl || undefined,
    url: appUrl(`/${site.slug}/prestations/${service.slug}`),
    provider: {
      "@type": "HealthAndBeautyBusiness",
      name: site.businessName,
      "@id": appUrl(`/${site.slug}`),
    },
    ...(service.priceType !== "QUOTE_ONLY" && service.price > 0
      ? {
          offers: {
            "@type": "Offer",
            price: toMajorUnits(service.price, site.currency),
            priceCurrency: site.currency,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    ...(service.steps.length > 0
      ? {
          hasPart: service.steps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.title,
            text: step.description || step.title,
          })),
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(node).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const crumbStyle: React.CSSProperties = {
  color: "var(--brand-muted)",
  textDecoration: "none",
};
