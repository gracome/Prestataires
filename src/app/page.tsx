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
        <section id="nous" className="mk-about">
          <div className="container">
            <div className="mk-about-grid">
              <div>
                <p className="mk-eyebrow">Qui sommes-nous</p>
                <h2 className="mk-h2">
                  Un atelier, pas une agence.
                </h2>
              </div>

              <div className="mk-about-text">
                <p>
                  {COMPANY.name} est un studio installé à {COMPANY.city}. Nous
                  construisons des sites et des outils pour des entreprises et
                  des indépendants d&apos;ici, nous formons les équipes qui
                  s&apos;en servent, et nous éditons nos propres produits quand
                  un besoin revient si souvent qu&apos;il mérite mieux
                  qu&apos;un développement à chaque fois.
                </p>
                <p>
                  Nous partons de l&apos;activité, jamais de la technologie. Ce
                  qui compte, c&apos;est ce que vous vendez, qui vous l&apos;
                  achète et ce qui vous fait perdre du temps ; le reste sont des
                  moyens. C&apos;est aussi pour ça que nous disons parfois
                  qu&apos;un projet ne vaut pas la peine d&apos;être construit —
                  une page bien tenue suffit souvent là où on nous demande une
                  application.
                </p>

                <ul className="mk-list">
                  <li>
                    <strong>Un prix, pas un pourcentage.</strong> Vous payez ce
                    qui a été convenu. Nous ne prenons rien au passage sur ce
                    que votre activité rapporte.
                  </li>
                  <li>
                    <strong>Ce que nous construisons vous appartient.</strong>{" "}
                    Le code, le nom de domaine, les comptes et les données sont
                    à vous. Vous pouvez partir avec, et changer de prestataire
                    sans tout recommencer.
                  </li>
                  <li>
                    <strong>Livré ne veut pas dire abandonné.</strong> Un site
                    vit : il se met à jour, il casse, il évolue. Nous restons
                    joignables après la mise en ligne.
                  </li>
                  <li>
                    <strong>On répond.</strong> En français, sur WhatsApp, par
                    les gens qui ont fait le travail.
                  </li>
                </ul>

                <a href={COMPANY.whatsapp} className="mk-btn mk-btn-ghost">
                  Parler à quelqu&apos;un
                </a>
              </div>
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
