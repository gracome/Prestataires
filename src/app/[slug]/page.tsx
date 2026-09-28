import Link from "next/link";
import {
  currentOpenState,
  getPublicSiteOrNotFound,
  groupServicesByCategory,
  telLink,
  whatsappLink,
  type PublicSite, bookingSubscribed
} from "@/lib/providers/public-site";
import { dayLabelFr, formatMinuteOfDay } from "@/lib/time";
import { LocalBusinessJsonLd } from "@/components/public/JsonLd";
import { ServiceCard } from "@/components/public/ServiceCard";
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

  return (
    <>
      <LocalBusinessJsonLd site={site} />

      <Hero site={site} bookingOpen={bookingOpen} />

      {/* The prestations lead, because that is what a visitor came to see.
          They curve up over the hero photograph. */}
      {settings?.showServices !== false && site.services.length > 0 ? (
        <Services site={site} bookingOpen={bookingOpen} />
      ) : null}

      {settings?.showGallery !== false && site.galleryImages.length > 0 ? (
        <PortfolioTeaser site={site} />
      ) : null}

      {settings?.showAbout !== false ? <About site={site} /> : null}

      {/* Reassurance reads once someone knows who she is, not before. */}
      <Commitments site={site} />

      {settings?.showHours !== false ? <Hours site={site} /> : null}

      {settings?.showLocation !== false && (site.addressLine || site.city) ? (
        <Location site={site} />
      ) : null}

      {settings?.showFaq !== false && site.faqItems.length > 0 ? (
        <Faq site={site} />
      ) : null}

      {settings?.showContact !== false ? (
        <Contact site={site} bookingOpen={bookingOpen} />
      ) : null}
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
  const showPrices = site.siteSettings?.showPricing !== false;

  return (
    <section className="section" id="prestations" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <SectionHead
          eyebrow="Prestations"
          title="Choisissez ce qui vous ressemble"
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
      style={{
        scrollMarginTop: 80,
        background: "color-mix(in srgb, var(--brand-accent) 14%, var(--brand-background))",
      }}
    >
      <div className="container">
        <SectionHead
          eyebrow="Réalisations"
          title="Le travail parle de lui-même"
          intro={
            site.siteSettings?.realisationsIntro?.trim() ||
            "Quelques rendus récents. Chaque photo correspond à une prestation que vous pouvez réserver."
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
 * About: portrait, story, a sentence in her own words, and the training that
 * backs the claims. A wall of text was the weak point before.
 */
function About({ site }: { site: PublicSite }) {
  const settings = site.siteSettings;
  const title = settings?.aboutTitle?.trim() || "À propos";
  const body = settings?.aboutBody?.trim() || site.description?.trim();
  const quote = settings?.aboutQuote?.trim();
  const portrait = settings?.aboutPortraitUrl || site.logoUrl;
  const credentials = site.highlights.filter((h) => h.kind === "CREDENTIAL");

  if (!body && !quote && credentials.length === 0) return null;

  return (
    <section className="section" id="a-propos" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gap: "2.5rem",
            gridTemplateColumns: portrait
              ? "repeat(auto-fit, minmax(min(100%, 280px), 1fr))"
              : "1fr",
            alignItems: "start",
          }}
        >
          {portrait ? (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portrait}
                alt={site.ownerName}
                loading="lazy"
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "cover",
                  borderRadius: 20,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "1rem",
                  bottom: "1rem",
                  right: "1rem",
                  background: "var(--brand-surface)",
                  borderRadius: 14,
                  padding: ".75rem .9rem",
                }}
              >
                <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>
                  {site.ownerName}
                </p>
                {site.tagline ? (
                  <p style={{ margin: ".1rem 0 0", fontSize: ".82rem", color: "var(--brand-muted)" }}>
                    {site.tagline}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <p className="eyebrow">{site.ownerName}</p>
            <h2
              className="font-display"
              style={{ fontSize: "clamp(1.7rem, 5vw, 2.4rem)", margin: ".35rem 0 1.25rem" }}
            >
              {title}
            </h2>

            {quote ? (
              <blockquote
                style={{
                  margin: "0 0 1.5rem",
                  paddingLeft: "1.1rem",
                  borderLeft: "3px solid var(--brand-primary)",
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.2rem",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                {quote}
              </blockquote>
            ) : null}

            {body ? (
              <div className="prose-sm">
                {body.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            {credentials.length > 0 ? (
              <div style={{ marginTop: "1.75rem" }}>
                <h3
                  style={{
                    fontSize: ".78rem",
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "var(--brand-muted)",
                    margin: "0 0 .85rem",
                    fontWeight: 600,
                  }}
                >
                  Formations et certifications
                </h3>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".6rem" }}>
                  {credentials.map((item) => (
                    <li
                      key={item.id}
                      style={{
                        display: "flex",
                        gap: ".85rem",
                        alignItems: "baseline",
                        paddingBottom: ".6rem",
                        borderBottom: "1px solid var(--brand-border)",
                      }}
                    >
                      {item.meta ? (
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--brand-primary)",
                            fontWeight: 700,
                            fontSize: ".85rem",
                            flexShrink: 0,
                          }}
                        >
                          {item.meta}
                        </span>
                      ) : null}
                      <span style={{ fontSize: ".92rem", lineHeight: 1.55 }}>
                        <strong style={{ fontWeight: 600 }}>{item.title}</strong>
                        {item.description ? (
                          <span style={{ display: "block", color: "var(--brand-muted)", fontSize: ".85rem" }}>
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
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

function Location({ site }: { site: PublicSite }) {
  return (
    <section className="section" id="localisation" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <SectionHead eyebrow="Nous trouver" title="Localisation" />

        <div className="card" style={{ maxWidth: 480 }}>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            {[site.addressLine, site.city, site.country].filter(Boolean).join(", ")}
          </p>
          {site.mapsUrl ? (
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ marginTop: "1rem", padding: ".55rem 1.1rem", minHeight: 40, fontSize: ".88rem" }}
            >
              Ouvrir dans Maps
            </a>
          ) : null}
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
