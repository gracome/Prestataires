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
              Nous construisons des outils et des sites pour les
              professionnelles et les entreprises béninoises, et nous formons
              celles et ceux qui s&apos;en servent. Nos produits supposent un
              téléphone, du Mobile Money et une connexion qui va et vient —
              parce que c&apos;est la réalité du terrain.
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
                  Une équipe béninoise, pour des métiers d&apos;ici.
                </h2>
              </div>

              <div className="mk-about-text">
                <p>
                  {COMPANY.name} est né à {COMPANY.city}, d&apos;un constat
                  simple : les outils qu&apos;on nous propose sont écrits
                  ailleurs, pour ailleurs. Ils supposent une carte bancaire, une
                  connexion stable, une secrétaire à l&apos;accueil. Ici, on
                  encaisse par Mobile Money, on répond sur WhatsApp entre deux
                  clientes, et on tient ses comptes dans un cahier.
                </p>
                <p>
                  Nous construisons donc l&apos;inverse : des outils pensés pour
                  des gens qui travaillent seuls ou à deux, qui n&apos;ont ni le
                  temps ni l&apos;envie d&apos;apprendre un logiciel, et pour
                  qui chaque franc compte. C&apos;est vrai des sites que nous
                  construisons, de ce que nous enseignons et des produits que
                  nous éditons.
                </p>

                <ul className="mk-list">
                  <li>
                    <strong>Un prix, pas un pourcentage.</strong> Nous ne
                    prenons rien au passage sur ce que vous encaissez. Vous
                    payez ce qui a été convenu, et vous savez toujours combien.
                  </li>
                  <li>
                    <strong>Ce que nous construisons vous appartient.</strong>{" "}
                    Vos données, votre nom de domaine, votre fichier clients.
                    Nous ne les revendons pas et nous n&apos;en faisons pas un
                    annuaire.
                  </li>
                  <li>
                    <strong>On répond.</strong> En français, sur WhatsApp, par
                    des gens qui connaissent le terrain.
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
