import Link from "next/link";
import {
  resolveSectionOrder,
  type SectionKey,
} from "@/lib/site/sections";
import {
  currentOpenState,
  getPublicSiteOrNotFound,
  groupServicesByCategory,
  serviceFamilies,
  telLink,
  whatsappLink,
  type PublicSite, bookingSubscribed
} from "@/lib/providers/public-site";
import { dayLabelFr, formatMinuteOfDay } from "@/lib/time";
import { LocalBusinessJsonLd } from "@/components/public/JsonLd";
import { ServiceCard } from "@/components/public/ServiceCard";
import { FamilyCard } from "@/components/public/FamilyCard";
import { formatMoney } from "@/lib/money";
import { HeroSlideshow, type HeroSlide } from "@/components/public/HeroSlideshow";
import { toServiceCard } from "@/lib/providers/service-card";

export const revalidate = 60;

export default async function ProviderHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublicSiteOrNotFound(slug);
  const settings = site.siteSettings;

  const bookable = site.services.filter((s) => s.priceType !== "QUOTE_ONLY");
  const bookingOpen =
    bookingSubscribed(site) &&
    (settings?.showBooking ?? true) &&
    (site.bookingSettings?.bookingEnabled ?? true) &&
    bookable.length > 0;

  // Her order, not the platform's. The hero stays first whatever she chose:
  // it is the page's opening and means nothing in the middle.
  const order = resolveSectionOrder(settings?.sectionOrder);

  // A section is drawn when she has kept it and there is something in it. The
  // second half matters as much as the first: an empty "Questions fréquentes"
  // heading with nothing under it looks like a broken page, not a choice.
  const sections: Record<SectionKey, React.ReactNode> = {
    services:
      settings?.showServices !== false && site.services.length > 0 ? (
        <Services key="services" site={site} bookingOpen={bookingOpen} />
      ) : null,
    gallery:
      settings?.showGallery !== false && site.galleryImages.length > 0 ? (
        <PortfolioTeaser key="gallery" site={site} />
      ) : null,
    about: settings?.showAbout !== false ? <About key="about" site={site} bookingOpen={bookingOpen} /> : null,
    commitments: <Commitments key="commitments" site={site} />,
    hours: settings?.showHours !== false ? <Hours key="hours" site={site} /> : null,
    location:
      settings?.showLocation !== false && (site.addressLine || site.city) ? (
        <Location key="location" site={site} />
      ) : null,
    faq:
      settings?.showFaq !== false && site.faqItems.length > 0 ? (
        <Faq key="faq" site={site} />
      ) : null,
    contact:
      settings?.showContact !== false ? (
        <Contact key="contact" site={site} bookingOpen={bookingOpen} />
      ) : null,
  };

  return (
    <>
      <LocalBusinessJsonLd site={site} />

      <Hero site={site} bookingOpen={bookingOpen} />

      {/* Every other section sits on a tinted band. On a dark palette the
          sections otherwise ran together as one black page with no edges.
          The first one keeps the page colour (it carries the curve over the
          hero), and the commitments strip is a band of its own, so it is
          left out of the count. */}
      {(() => {
        let position = 0;
        return order.map((key) => {
          const node = sections[key];
          if (!node || key === "commitments") return node;
          const tinted = position % 2 === 1;
          position += 1;
          return tinted ? (
            <div key={key} className="section-band">
              {node}
            </div>
          ) : (
            node
          );
        });
      })()}
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

/**
 * The hero carries the whole first impression, so it does four jobs at once:
 * it shows the work, names the trade and the city, says whether the salon is
 * open right now, and puts booking one tap away.
 */
function Hero({ site, bookingOpen }: { site: PublicSite; bookingOpen: boolean }) {
  const settings = site.siteSettings;
  const headline = settings?.heroHeadline?.trim() || site.businessName;
  const sub =
    settings?.heroSubheadline?.trim() ||
    site.tagline ||
    "Prenez rendez-vous en ligne en quelques secondes.";

  const eyebrow =
    settings?.heroEyebrow?.trim() ||
    [site.tagline, site.city].filter(Boolean).join(" · ") ||
    site.city ||
    "";

  const openState = currentOpenState(site.workingHours, site.timezone);
  const whatsapp = whatsappLink(site);
  const ctaLabel = settings?.heroCtaLabel?.trim() || "Prendre rendez-vous";

  // Her cover leads, then the gallery. Duplicates are dropped so the same
  // photograph is not shown twice in a row when the cover is also in the
  // gallery, which is the common case.
  const seen = new Set<string>();
  const slides: HeroSlide[] = [];
  for (const url of [site.coverImageUrl, ...site.galleryImages.map((i) => i.url)]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    slides.push({ id: url, url });
    if (slides.length === 5) break;
  }

  if (slides.length === 0) {
    return (
      <section className="site-hero">
        <span aria-hidden="true" className="site-hero-fallback" />
        <span aria-hidden="true" className="site-hero-scrim" />
        <HeroWords
          site={site}
          eyebrow={eyebrow}
          headline={headline}
          sub={sub}
          ctaLabel={ctaLabel}
          whatsapp={whatsapp}
          openState={openState}
          bookingOpen={bookingOpen}
        />
      </section>
    );
  }

  return (
    <HeroSlideshow slides={slides}>
      <HeroWords
        site={site}
        eyebrow={eyebrow}
        headline={headline}
        sub={sub}
        ctaLabel={ctaLabel}
        whatsapp={whatsapp}
        openState={openState}
        bookingOpen={bookingOpen}
      />
    </HeroSlideshow>
  );
}

/** The words over the hero, which stay put while the photographs turn. */
function HeroWords({
  site,
  eyebrow,
  headline,
  sub,
  ctaLabel,
  whatsapp,
  openState,
  bookingOpen,
}: {
  site: PublicSite;
  eyebrow: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  whatsapp: string | null;
  openState: ReturnType<typeof currentOpenState>;
  bookingOpen: boolean;
}) {
  return (
    <div className="container site-hero-body">
        {eyebrow ? <p className="site-hero-eyebrow">{eyebrow}</p> : null}

        <h1 className="site-hero-title">{headline}</h1>

        <p className="site-hero-sub">{sub}</p>

        <div className="site-hero-actions">
          {bookingOpen ? (
            <Link href={`/${site.slug}/reservation`} className="btn btn-primary">
              {ctaLabel} →
            </Link>
          ) : null}
          {whatsapp ? (
            <a href={whatsapp} className="btn site-hero-ghost">
              WhatsApp
            </a>
          ) : null}
        </div>

      <p className="site-hero-open">
        {openState.open
          ? `Ouvert jusqu'à ${openState.closesAt}`
          : openState.nextDay && openState.nextOpensAt
            ? `Ouvre ${openState.nextDay} à ${openState.nextOpensAt}`
            : "Fermé actuellement"}
      </p>
    </div>
  );
}

/** The provider's promises, read immediately after the hero. */
function Commitments({ site }: { site: PublicSite }) {
  const commitments = site.highlights.filter((h) => h.kind === "COMMITMENT");
  if (commitments.length === 0) return null;

  return (
    <section
      style={{
        borderBottom: "1px solid var(--brand-border)",
        background: "var(--brand-surface)",
      }}
    >
      <div className="container" style={{ paddingBlock: "1.6rem" }}>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: "1.1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          {commitments.map((item) => (
            <li key={item.id}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: ".95rem",
                  display: "flex",
                  alignItems: "baseline",
                  gap: ".5rem",
                }}
              >
                {item.meta ? (
                  <span
                    className="font-display"
                    style={{ color: "var(--brand-primary)", fontSize: "1.35rem" }}
                  >
                    {item.meta}
                  </span>
                ) : null}
                {item.title}
              </p>
              {item.description ? (
                <p
                  style={{
                    margin: ".25rem 0 0",
                    fontSize: ".85rem",
                    lineHeight: 1.55,
                    color: "var(--brand-muted)",
                  }}
                >
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function SectionHead({
  eyebrow,
  title,
  intro,
  action,
}: {
  eyebrow: string;
  title: string;
  intro?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <div className={action ? "section-head section-head-split" : "section-head"}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="section-title">{title}</h2>
        {intro ? <p>{intro}</p> : null}
      </div>
      {action ?? null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Services({ site, bookingOpen }: { site: PublicSite; bookingOpen: boolean }) {
  const groups = groupServicesByCategory(site.services);
  const families = serviceFamilies(site);
  const showPrices = site.siteSettings?.showPricing !== false;

  return (
    // The first band after the hero carries the curve that closes the
    // photograph — see .section-curved.
    <section
      className="section section-curved"
      id="prestations"
      style={{ scrollMarginTop: 80 }}
    >
      <div className="container">
        <SectionHead
          eyebrow="Prestations"
          title="Mes savoir-faire"
          intro={
            site.siteSettings?.servicesIntro?.trim() ||
            "Chaque prestation a sa fiche, avec le déroulé étape par étape, la durée réelle et ce qui est compris dans le prix."
          }
          action={
            <Link href={`/${site.slug}/prestations`} className="btn btn-secondary">
              Toutes les prestations
            </Link>
          }
        />

        {/* Several trades: the home page names them and lets the catalogue
            list what each holds. Every prestation as a photo card made the
            page all catalogue and left her no room. */}
        {families.length > 1 ? (
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
          <div style={{ display: "grid", gap: "2.5rem" }}>
            {groups.map((group) => (
              <div key={group.category?.id ?? "sans-categorie"}>
                {group.category ? (
                  <h3
                    style={{
                      fontSize: ".8rem",
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      color: "var(--brand-muted)",
                      margin: "0 0 1rem",
                      fontWeight: 600,
                    }}
                  >
                    {group.category.name}
                  </h3>
                ) : null}
  
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: "1rem",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 270px), 1fr))",
                  }}
                >
                  {group.services.map((service, position) => (
                    <li key={service.id}>
                      <ServiceCard
                        index={position}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PortfolioTeaser({ site }: { site: PublicSite }) {
  const preview = site.galleryImages.slice(0, 8);

  return (
    <section
      className="section"
      id="galerie"
      style={{ scrollMarginTop: 80 }}
    >
      <div className="container">
        <SectionHead
          eyebrow="Réalisations"
          title="Le travail parle de lui-même"
          intro={
            site.siteSettings?.realisationsIntro?.trim() ||
            "Quelques réalisations récentes. Chaque photo correspond à une prestation que vous pouvez réserver."
          }
          action={
            site.siteSettings?.showRealisations !== false ? (
              <Link href={`/${site.slug}/realisations`} className="btn btn-secondary">
                Voir la vitrine complète
              </Link>
            ) : null
          }
        />

        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: ".7rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 1fr))",
          }}
        >
          {preview.map((image) => (
            <li key={image.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.caption ?? ""}
                loading="lazy"
                decoding="async"
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  borderRadius: 14,
                  background: "var(--brand-surface)",
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * About, told in her voice — the whole site speaks as her.
 *
 * Laid out like a magazine page: a picture on one side, the words on the
 * other. Her portrait when she has given one; otherwise three of her own
 * realisations, one per trade where she has several, so the section still
 * opens on her work rather than on a block of text. A gallery photo is never
 * captioned with her name: the person in it is a customer.
 */
function About({ site, bookingOpen }: { site: PublicSite; bookingOpen: boolean }) {
  const settings = site.siteSettings;
  const title = settings?.aboutTitle?.trim() || "À propos";
  const body = settings?.aboutBody?.trim() || site.description?.trim();
  const quote = settings?.aboutQuote?.trim();
  const portrait = settings?.aboutPortraitUrl || site.logoUrl;
  const credentials = site.highlights.filter((h) => h.kind === "CREDENTIAL");

  if (!body && !quote && credentials.length === 0) return null;

  // One photograph per category first, then whatever comes next.
  const mosaic: PublicSite["galleryImages"] = [];
  if (!portrait) {
    const seen = new Set<string>();
    for (const image of site.galleryImages) {
      const key = image.categoryId ?? image.id;
      if (seen.has(key)) continue;
      seen.add(key);
      mosaic.push(image);
      if (mosaic.length === 3) break;
    }
    for (const image of site.galleryImages) {
      if (mosaic.length === 3) break;
      if (!mosaic.includes(image)) mosaic.push(image);
    }
  }

  const firstName = site.ownerName.split(" ")[0];
  const social = site.socialLinks[0];

  return (
    <section className="section about" id="a-propos" style={{ scrollMarginTop: 80 }}>
      <div className="container about-grid" data-visual={portrait || mosaic.length > 0 ? "" : undefined}>
        {portrait ? (
          <figure className="about-portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portrait} alt={site.ownerName} loading="lazy" />
            <figcaption>
              <span className="about-portrait-name">{site.ownerName}</span>
              <span className="about-portrait-role">Fondatrice de {site.businessName}</span>
            </figcaption>
          </figure>
        ) : mosaic.length > 0 ? (
          <div className="about-mosaic" data-count={mosaic.length} aria-hidden="true">
            {mosaic.map((image) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={image.id} src={image.url} alt="" loading="lazy" />
            ))}
          </div>
        ) : null}

        <div className="about-text">
          <p className="eyebrow">À propos</p>
          <h2 className="font-display about-title">{title}</h2>

          {quote ? <blockquote className="about-quote">{quote}</blockquote> : null}

          {body ? (
            <div className="about-body">
              {body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          <p className="about-signature">{firstName}</p>

          {bookingOpen || social ? (
            <div className="about-actions">
              {bookingOpen ? (
                <Link href={`/${site.slug}/reservation`} className="btn btn-primary">
                  Prendre rendez-vous
                </Link>
              ) : null}
              {social ? (
                <a href={social.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Mon travail sur {socialLabel(social.platform)}
                </a>
              ) : null}
            </div>
          ) : null}

          {credentials.length > 0 ? (
            <div className="about-credentials">
              <h3>Formations et certifications</h3>
              <ul>
                {credentials.map((item) => (
                  <li key={item.id}>
                    {item.meta ? <span className="about-credential-meta">{item.meta}</span> : null}
                    <span>
                      <strong>{item.title}</strong>
                      {item.description ? <span className="about-credential-desc">{item.description}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** "tiktok" → "TikTok": the platform as people write it. */
function socialLabel(platform: string): string {
  const known: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    youtube: "YouTube",
    snapchat: "Snapchat",
    whatsapp: "WhatsApp",
  };
  return known[platform.toLowerCase()] ?? platform;
}

function Hours({ site }: { site: PublicSite }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(site.workingHours.map((wh) => [wh.dayOfWeek, wh]));
  const openState = currentOpenState(site.workingHours, site.timezone);

  return (
    <section className="section" id="horaires" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <SectionHead
          eyebrow="Disponibilités"
          title="Horaires"
          intro={
            openState.open
              ? `C'est ouvert en ce moment, jusqu'à ${openState.closesAt}.`
              : openState.nextDay
                ? `Fermé actuellement. Réouverture ${openState.nextDay} à ${openState.nextOpensAt}.`
                : null
          }
        />

        <div className="band">
        <div className="card" style={{ padding: ".4rem 1.1rem" }}>
          <dl style={{ margin: 0 }}>
            {order.map((day) => {
              const rule = byDay.get(day);
              const open = rule?.active ?? false;
              const hasBreak =
                open && rule?.breakStartMinute != null && rule?.breakEndMinute != null;

              return (
                <div
                  key={day}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    padding: ".72rem 0",
                    borderBottom: day === 0 ? "none" : "1px solid var(--brand-border)",
                  }}
                >
                  <dt style={{ fontWeight: 600, textTransform: "capitalize" }}>
                    {dayLabelFr(day)}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      color: open ? "var(--brand-text)" : "var(--brand-muted)",
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {open && rule ? (
                      hasBreak ? (
                        <>
                          {formatMinuteOfDay(rule.openMinute)}–
                          {formatMinuteOfDay(rule.breakStartMinute as number)}
                          <br />
                          {formatMinuteOfDay(rule.breakEndMinute as number)}–
                          {formatMinuteOfDay(rule.closeMinute)}
                        </>
                      ) : (
                        `${formatMinuteOfDay(rule.openMinute)}–${formatMinuteOfDay(rule.closeMinute)}`
                      )
                    ) : (
                      "Fermé"
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

          {photoFor(site, 1) ? (
            <div className="band-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoFor(site, 1)!} alt="" loading="lazy" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Where she works, on an actual map.
 *
 * An address printed in a box is the least useful form the information can
 * take: nobody reads a street name in Cotonou and knows where to go. Shown on
 * a map it answers the question; without one the section is removed rather
 * than left as a heading over a small white rectangle.
 *
 * Coordinates give a precise pin through OpenStreetMap, which needs no key and
 * loads nothing that follows the visitor. With only an address we fall back to
 * Google's embed, which can find a place from its name — the common case here,
 * where a street number is often approximate.
 */
function Location({ site }: { site: PublicSite }) {
  const address = [site.addressLine, site.city, site.country]
    .filter(Boolean)
    .join(", ");

  const hasPin = site.latitude !== null && site.longitude !== null;

  const mapSrc = hasPin
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        site.longitude! - 0.004
      }%2C${site.latitude! - 0.003}%2C${site.longitude! + 0.004}%2C${
        site.latitude! + 0.003
      }&layer=mapnik&marker=${site.latitude}%2C${site.longitude}`
    : address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`
      : null;

  // Nothing to show on a map means nothing worth a section.
  if (!mapSrc) return null;

  const directions =
    site.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <section className="section" id="localisation" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <SectionHead eyebrow="Nous trouver" title="Localisation" />

        <div className="band">
          <div>
            <p className="location-address">{address}</p>

            {site.city ? (
              <p className="location-note">
                Le quartier est indiqué sur la carte. Écrivez-nous si vous
                préférez un point de repère.
              </p>
            ) : null}

            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Ouvrir l&apos;itinéraire →
            </a>
          </div>

          <div className="location-map">
            <iframe
              src={mapSrc}
              title={`Carte — ${site.businessName}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
function Faq({ site }: { site: PublicSite }) {
  return (
    <section className="section" id="faq" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <SectionHead eyebrow="Questions" title="Questions fréquentes" />

        <div className="band" data-reverse>
          <div style={{ display: "grid", gap: ".6rem" }}>
          {site.faqItems.map((item) => (
            <details key={item.id} className="card" style={{ padding: "1rem 1.15rem" }}>
              <summary
                style={{ cursor: "pointer", fontWeight: 600, listStyle: "revert", minHeight: 28 }}
              >
                {item.question}
              </summary>
              <p
                style={{
                  margin: ".7rem 0 0",
                  lineHeight: 1.7,
                  color: "var(--brand-muted)",
                  whiteSpace: "pre-line",
                }}
              >
                {item.answer}
              </p>
            </details>
            ))}
          </div>

          <div className="band-dark">
            {photoFor(site, 2) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photoFor(site, 2)!} alt="" loading="lazy" />
            ) : null}
            <div>
              <h3>Une autre question ?</h3>
              <p>
                Écrivez directement à {site.businessName}. On vous répond dans la
                journée.
              </p>
              {whatsappLink(site) ? (
                <a href={whatsappLink(site)!} className="btn site-hero-ghost">
                  Écrire sur WhatsApp
                </a>
              ) : (
                <a href={`mailto:${site.email}`} className="btn site-hero-ghost">
                  Envoyer un email
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A photograph from her gallery, by position, for the bands that need one.
 * Returns null rather than a placeholder: an empty half is better than a stock
 * image pretending to be her work.
 */
function photoFor(site: PublicSite, index: number): string | null {
  return site.galleryImages[index]?.url ?? null;
}

function Contact({ site, bookingOpen }: { site: PublicSite; bookingOpen: boolean }) {
  const whatsapp = whatsappLink(site);
  const tel = telLink(site.phone);
  const policy = site.bookingSettings?.cancellationPolicy?.trim();

  return (
    <section className="section" id="contact" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <div
          className="card"
          style={{
            padding: "2.5rem 1.6rem",
            background:
              "linear-gradient(140deg, color-mix(in srgb, var(--brand-accent) 32%, var(--brand-surface)), var(--brand-surface))",
          }}
        >
          <SectionHead eyebrow="Contact" title="Une question avant de réserver ?" />

          <p style={{ color: "var(--brand-muted)", lineHeight: 1.7, maxWidth: 520, marginTop: "-1rem" }}>
            Écrivez directement sur WhatsApp, ou réservez votre créneau en ligne
            à tout moment, même en dehors des heures d&apos;ouverture.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: ".7rem", marginTop: "1.5rem" }}>
            {bookingOpen ? (
              <Link href={`/${site.slug}/reservation`} className="btn btn-primary">
                Prendre rendez-vous
              </Link>
            ) : null}
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                WhatsApp
              </a>
            ) : null}
            {tel ? (
              <a href={tel} className="btn btn-secondary">
                Appeler
              </a>
            ) : null}
            <a href={`mailto:${site.email}`} className="btn btn-ghost">
              Envoyer un email
            </a>
          </div>

          {site.paymentInstructions.length > 0 ? (
            <p style={{ marginTop: "1.75rem", fontSize: ".85rem", color: "var(--brand-muted)" }}>
              Moyens de paiement acceptés :{" "}
              {site.paymentInstructions.map((p) => p.paymentMethod).join(", ")}.
            </p>
          ) : null}

          {policy ? (
            <p
              style={{
                marginTop: ".5rem",
                fontSize: ".85rem",
                color: "var(--brand-muted)",
                lineHeight: 1.65,
                whiteSpace: "pre-line",
              }}
            >
              {policy}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
