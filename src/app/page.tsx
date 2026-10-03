import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CompanyHeader } from "@/components/marketing/CompanyHeader";
import { CompanyFooter } from "@/components/marketing/CompanyFooter";
import { COMPANY, OFFERS } from "@/lib/marketing/company";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * The company's home page.
 *
 * A visitor arriving here may want a site built for her, something taught, or
 * the booking platform. The page has to let all three through, so it sells
 * none of them on the doorstep: it says who we are, shows what we do with the
 * three offers carrying equal weight, and sends each visitor to the page that
 * actually answers her.
 *
 * It is built as six movements with deliberately different rhythms — a tall
 * statement, a thin band of facts, three columns, a wide panel, a statement
 * again, then the foot. The version before this one was three stacked blocks
 * of prose, which reads as a document rather than as a page: without a change
 * of shape there is nothing to tell a reader she has arrived somewhere new,
 * and she scrolls past all of it at the same speed.
 *
 * No photographs. Every picture of a working business is a picture of one
 * trade, and this company serves several; the restraint is also most of what
 * makes the page feel considered rather than assembled.
 *
 * It wears the studio skin — ivory and petrol — never the rose a provider's
 * site wears. When the two looked alike, the product looked like a template
 * rather than something she owns.
 */

export const metadata: Metadata = {
  title: `${COMPANY.name} — studio digital à Porto-Novo`,
  description:
    "Sites web sur mesure, formations au digital et Prestataire, notre plateforme de réservation. À Porto-Novo et Cotonou.",
};

export default async function HomePage() {
  // The demonstration tenant is a real provider row. Counting it would inflate
  // the one figure on this page a visitor could check.
  const demoSlug = env().DEMO_SLUG;
  const providerCount = await prisma.provider
    .count({
      where: {
        status: "ACTIVE",
        ...(demoSlug ? { slug: { not: demoSlug } } : {}),
      },
    })
    .catch(() => 0);

  return (
    <div className="mk" data-skin="studio">
      <CompanyHeader />

      <main>
        {/* ------------------------------------------------------------ Hero */}
        <section className="mk-hero">
          <div className="container">
            <p className="mk-eyebrow">{COMPANY.tagline}</p>

            <h1 className="mk-hero-title">
              Le numérique, à hauteur
              <br />
              <span className="mk-hero-rest">des activités d&apos;ici.</span>
            </h1>

            <p className="mk-hero-sub">
              Nous construisons des sites et des outils pour les entreprises et
              les indépendants du Bénin, et nous formons les équipes qui
              s&apos;en servent. Ce que nous livrons marche sur un téléphone,
              encaisse par Mobile Money et tient sur une connexion qui va et
              vient.
            </p>

            {/* Both lead to the company, not to one of its products: a visitor
                who has not said what she came for should not be pushed towards
                the thing we happen to sell off the shelf. */}
            <div className="mk-hero-actions">
              <a href="#services" className="mk-btn">
                Ce que nous faisons
              </a>
              <a href={COMPANY.whatsapp} className="mk-btn mk-btn-ghost">
                Parler de votre projet
              </a>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- Faits */}
        {/* Four things a visitor can check, rather than four adjectives. The
            only one that moves is the provider count, which is why it is worth
            putting next to three that do not. */}
        <section className="mk-facts">
          <div className="container">
            <dl>
              <div>
                <dt>Basés à</dt>
                <dd>{COMPANY.city}</dd>
              </div>
              <div>
                <dt>Produit en production</dt>
                <dd>Prestataire</dd>
              </div>
              <div>
                <dt>Commission sur votre activité</dt>
                <dd>0 %</dd>
              </div>
              <div>
                <dt>Ce que nous livrons</dt>
                <dd>vous appartient</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* -------------------------------------------- Ce que nous faisons */}
        <section id="services" className="mk-section">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Ce que nous faisons</p>
              <h2 className="mk-h2">Trois façons de travailler ensemble.</h2>
            </div>

            {/* Hairline columns rather than bordered cards. Three boxes in a
                row is the shape of a pricing table, and only one of these has
                a price. */}
            <ol className="mk-offers">
              {OFFERS.map((offer, index) => (
                <li key={offer.slug}>
                  <p className="mk-offer-meta">
                    <span aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {offer.kind}
                  </p>

                  <h3>{offer.name}</h3>
                  <p className="mk-offer-summary">{offer.summary}</p>

                  <ul className="mk-list">
                    {offer.covers.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>

                  <Link href={offer.href} className="mk-offer-link">
                    {offer.cta} →
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --------------------------------------------------- Notre travail */}
        {/* The portfolio, such as it is. One product, in production, that
            anyone can open and press every button of — which is worth more
            than a gallery of screenshots nobody can click. */}
        <section className="mk-case">
          <div className="container">
            <div className="mk-case-grid">
              <div>
                <p className="mk-eyebrow">Notre travail</p>
                <h2 className="mk-h2">
                  Jugez-nous sur quelque chose qui tourne.
                </h2>
                <p className="mk-case-text">
                  Prestataire est notre plateforme de réservation pour les
                  métiers de la beauté. Elle est en production, et nous la
                  laissons ouverte : un compte complet avec ses prestations,
                  ses photos et plusieurs mois de rendez-vous, où tous les
                  boutons fonctionnent.
                </p>
                <p className="mk-case-text">
                  C&apos;est la façon la plus honnête de montrer ce que nous
                  savons faire, et c&apos;est aussi celle qui nous engage le
                  plus.
                </p>

                <div className="mk-case-actions">
                  <Link href="/demo" className="mk-btn">
                    Ouvrir la démonstration →
                  </Link>
                  <Link href="/prestataire" className="mk-offer-link">
                    Comment c&apos;est vendu →
                  </Link>
                </div>
              </div>

              <ul className="mk-case-list">
                <li>
                  <b>Un site par prestataire</b>
                  <span>
                    Sa propre adresse, ses photos, ses tarifs, sa prise de
                    rendez-vous.
                  </span>
                </li>
                <li>
                  <b>Un agenda qui ne se trompe pas</b>
                  <span>
                    Deux clientes ne peuvent pas réserver le même créneau : la
                    base de données le refuse.
                  </span>
                </li>
                <li>
                  <b>Acomptes, caisse et chiffres</b>
                  <span>
                    Ce qui a été encaissé, ce qui reste dû, ce qui marche.
                  </span>
                </li>
                {providerCount > 0 ? (
                  <li>
                    <b>
                      {providerCount} activité{providerCount > 1 ? "s" : ""} en
                      ligne
                    </b>
                    <span>Hors compte de démonstration.</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- Qui sommes-nous */}
        <section id="nous" className="mk-about">
          <div className="container">
            <div className="mk-about-head">
              <p className="mk-eyebrow">Qui sommes-nous</p>
              <h2 className="mk-statement">
                Un atelier à {COMPANY.city}, qui part de votre activité
                — <span>jamais de la technologie.</span>
              </h2>
              <p className="mk-about-lead">
                Nous construisons des sites et des outils pour des entreprises
                et des indépendants d&apos;ici, nous formons les équipes qui
                s&apos;en servent, et nous éditons nos propres produits quand un
                besoin revient trop souvent pour être redéveloppé à chaque fois.
              </p>
            </div>

            <ul className="mk-principles">
              {PRINCIPLES.map((principle, index) => (
                <li key={principle.title}>
                  <span aria-hidden="true" className="mk-principle-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </li>
              ))}
            </ul>

            <div className="mk-about-foot">
              <p>
                Il nous arrive de dire qu&apos;un projet ne vaut pas la peine
                d&apos;être construit. Une page bien tenue suffit souvent là où
                on nous demande une application.
              </p>
              <a href={COMPANY.whatsapp} className="mk-btn">
                Parler à quelqu&apos;un →
              </a>
            </div>
          </div>
        </section>
      </main>

      <CompanyFooter />
    </div>
  );
}

/**
 * What we promise, in four lines.
 *
 * Each one is a thing a client can hold us to and a thing a competitor would
 * hesitate to write down — which is the test a promise has to pass before it
 * earns space on a home page. Anything that would be true of any studio in the
 * world ("qualité", "à l'écoute") is not here.
 */
const PRINCIPLES = [
  {
    title: "Un prix, pas un pourcentage",
    body: "Vous payez ce qui a été convenu. Nous ne prenons rien au passage sur ce que votre activité rapporte.",
  },
  {
    title: "Ce qu'on construit vous appartient",
    body: "Le code, le domaine, les comptes, les données. Vous pouvez partir avec et changer de prestataire sans tout recommencer.",
  },
  {
    title: "Livré ne veut pas dire abandonné",
    body: "Un site vit : il se met à jour, il casse, il évolue. Nous restons joignables après la mise en ligne.",
  },
  {
    title: "On répond",
    body: "En français, sur WhatsApp, par les gens qui ont fait le travail — pas par un formulaire.",
  },
] as const;
