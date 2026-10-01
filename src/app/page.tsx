import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CompanyHeader } from "@/components/marketing/CompanyHeader";
import { CompanyFooter } from "@/components/marketing/CompanyFooter";
import { COMPANY, OFFERS } from "@/lib/marketing/company";

export const dynamic = "force-dynamic";

/**
 * The company's home page.
 *
 * It used to be the Prestataire landing page, which quietly said the company
 * was one product. It is not: a visitor arriving here may want a booking
 * platform, or a site built for her, or to learn to use the tools she already
 * has. This page has to let all three through.
 *
 * So it sells nothing on the doorstep. It says who we are, shows the three
 * things we do, each carrying the same weight — custom work, training, and one
 * product — and sends each visitor to the page that actually answers her. The
 * platform has its own argument at /prestataire, where there is room to make
 * it; it does not get to make it here, over the others.
 *
 * It wears the .mk skin, flat and typographic, never the photographic one a
 * provider's site wears. When the two looked alike, the product looked like a
 * template rather than something she owns.
 */

export const metadata: Metadata = {
  title: `${COMPANY.name} — studio digital à Porto-Novo`,
  description:
    "Plateforme de réservation pour les métiers de la beauté, sites web sur mesure et formations au digital. À Porto-Novo et Cotonou.",
};

export default async function HomePage() {
  // Shown only as a sign of life, and only once there is one to show.
  const providerCount = await prisma.provider
    .count({ where: { status: "ACTIVE" } })
    .catch(() => 0);

  return (
    <div className="mk" data-skin="studio">
      <CompanyHeader />

      <main>
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
              vient — parce que c&apos;est le terrain.
            </p>

            {/* Both lead to the company, not to one of its products: a
                visitor who has not said what she came for should not be
                pushed towards the thing we happen to sell off the shelf. */}
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

        {/* ---------------------------------------------- Ce que nous faisons */}
        <section id="services" className="mk-section mk-section-quiet">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Ce que nous faisons</p>
              <h2 className="mk-h2">Trois façons de travailler ensemble.</h2>
            </div>

            <div className="mk-offers">
              {OFFERS.map((offer) => (
                <article key={offer.slug} className="mk-offer">
                  <p className="mk-offer-tag">{offer.kind}</p>

                  <h3>{offer.name}</h3>
                  <p className="mk-offer-summary">{offer.summary}</p>

                  <ul className="mk-list">
                    {offer.covers.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>

                  <Link href={offer.href} className="mk-btn mk-btn-ghost">
                    {offer.cta} →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- Qui sommes-nous */}
        {/* A heading that carries the whole statement, then the promises laid
            out as four short columns. The previous version was a two-column
            article: a wall of prose against a stack of ticked lines, ending on
            a lone button. Nobody reads a wall, and four promises that matter
            deserve to be looked at rather than scrolled past. */}
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

      <CompanyFooter
        note={
          providerCount > 0
            ? `${providerCount} prestataire${providerCount > 1 ? "s" : ""} en ligne`
            : undefined
        }
      />
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
