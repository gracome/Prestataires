import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyHeader } from "@/components/marketing/CompanyHeader";
import { CompanyFooter } from "@/components/marketing/CompanyFooter";
import { COMPANY, OFFERS } from "@/lib/marketing/company";

/**
 * A service page.
 *
 * Unlike Prestataire, these are engagements rather than products: there is no
 * price list, because what a site or a course costs depends on what it has to
 * do. So the page does the next most useful thing — it says plainly what the
 * work covers, how it runs, and what we need from the client — and ends on a
 * conversation rather than a checkout.
 *
 * Saying "à partir de X" here would be worse than saying nothing: a figure
 * pulled out of the air either loses the serious enquiry or traps us into it.
 */

export const dynamic = "force-static";

/** The two engagements. Prestataire has its own page and is excluded. */
const DETAILS: Record<
  string,
  {
    eyebrow: string;
    title: string;
    lead: string;
    sections: readonly { heading: string; items: readonly string[] }[];
    needed: readonly string[];
    closing: string;
  }
> = {
  "sites-web": {
    eyebrow: "Sites web sur mesure",
    title: "Un site construit pour votre activité, pas pour un gabarit.",
    lead: "Un gabarit acheté en ligne vous donne la forme d'une autre entreprise. Nous partons de ce que vous vendez, de qui vous l'achète et de la façon dont on vous joint — et le site suit.",
    sections: [
      {
        heading: "Ce que nous construisons",
        items: [
          "Sites vitrines : ce que vous faites, où vous êtes, comment vous joindre.",
          "Boutiques en ligne, avec paiement Mobile Money et suivi des commandes.",
          "Prise de rendez-vous, quand votre métier tourne à l'agenda.",
          "Applications métier : un outil qui remplace un cahier ou un tableur.",
        ],
      },
      {
        heading: "Comment ça se passe",
        items: [
          "On se parle : votre activité, vos clients, ce qui vous fait perdre du temps.",
          "Nous proposons une maquette et un devis. Rien ne commence avant votre accord.",
          "Nous construisons, vous regardez avancer, vous corrigez au fur et à mesure.",
          "Mise en ligne, nom de domaine, hébergement et prise en main.",
          "Ensuite, maintenance : le site vit, il n'est pas livré puis abandonné.",
        ],
      },
      {
        heading: "Ce qui est compris",
        items: [
          "Le nom de domaine et l'hébergement de la première année.",
          "Un site qui fonctionne sur téléphone d'abord, parce que vos clients y sont.",
          "Des pages qui se chargent sur une connexion lente.",
          "La formation de la personne qui s'en occupera chez vous.",
        ],
      },
    ],
    needed: [
      "Vos textes, ou une conversation pour que nous les écrivions.",
      "Vos photos, ou un accord pour que nous en produisions.",
      "Un nom de domaine, si vous en avez déjà un.",
    ],
    closing:
      "Le prix dépend de ce que le site doit faire. Dites-nous ce que vous avez en tête et vous aurez un devis, pas une fourchette.",
  },

  formations: {
    eyebrow: "Formations au digital",
    title: "Apprendre à se servir des outils, plutôt qu'à les subir.",
    lead: "La plupart des gens ont déjà tout ce qu'il faut dans la main. Ce qui manque, ce n'est pas l'équipement : c'est d'avoir montré une fois, calmement, comment on s'en sert pour son propre travail.",
    sections: [
      {
        heading: "Ce que nous enseignons",
        items: [
          "Tenir son activité depuis un téléphone : agenda, clients, comptes.",
          "Réseaux sociaux : publier, répondre, vendre sans y passer ses journées.",
          "Vendre en ligne : présenter, encaisser, livrer, gérer les retours.",
          "Bureautique : écrire un devis, une facture, un tableau qui calcule seul.",
          "Prestataire, pour les professionnelles qui viennent d'ouvrir leur compte.",
        ],
      },
      {
        heading: "Comment ça se passe",
        items: [
          "En groupe, sur une demi-journée ou plusieurs séances courtes.",
          "En individuel, chez vous ou dans votre salon, à votre rythme.",
          "À distance, quand le déplacement n'a pas de sens.",
          "Sur place à Porto-Novo et Cotonou ; ailleurs, on en parle.",
        ],
      },
      {
        heading: "Ce que vous repartez avec",
        items: [
          "Un support écrit en français, fait pour être relu seul.",
          "Vos propres outils configurés, pas ceux d'un exercice.",
          "De quoi nous joindre quand vous bloquerez, parce que ça arrive.",
        ],
      },
    ],
    needed: [
      "Un téléphone ou un ordinateur, celui dont vous vous servez vraiment.",
      "Ce que vous voulez savoir faire à la fin. C'est de là que part le programme.",
    ],
    closing:
      "Le prix dépend du format et du nombre de participants. Dites-nous ce que vous cherchez à apprendre.",
  },
};

export function generateStaticParams() {
  return Object.keys(DETAILS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = DETAILS[slug];
  if (!detail) return { title: "Page introuvable" };

  return {
    title: `${detail.eyebrow} | ${COMPANY.name}`,
    description: detail.lead,
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = DETAILS[slug];
  if (!detail) notFound();

  const others = OFFERS.filter((offer) => offer.slug !== slugToOffer(slug));

  return (
    <div className="mk">
      <CompanyHeader />

      <main>
        <section className="mk-module-head">
          <div className="container">
            <p className="mk-eyebrow">{detail.eyebrow}</p>
            <h1 className="mk-module-title">{detail.title}</h1>
            <p className="mk-module-intro">{detail.lead}</p>

            <div className="mk-hero-actions">
              <a href={COMPANY.whatsapp} className="mk-btn">
                Parler de votre projet
              </a>
            </div>
          </div>
        </section>

        <section className="mk-section">
          <div className="container">
            <div className="mk-steps-grid">
              {detail.sections.map((section) => (
                <article key={section.heading}>
                  <h2>{section.heading}</h2>
                  <ul className="mk-list">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="mk-callout">
              <h3>Ce dont nous avons besoin de votre côté</h3>
              <ul className="mk-list">
                {detail.needed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mk-callout mk-callout-accent">
              <h3>Combien ça coûte</h3>
              <p>{detail.closing}</p>
              <a href={COMPANY.whatsapp} className="mk-btn">
                Nous écrire sur WhatsApp →
              </a>
            </div>
          </div>
        </section>

        <section className="mk-section mk-section-quiet">
          <div className="container">
            <h2 className="mk-other-title">Le reste de ce que nous faisons</h2>
            <ul className="mk-other">
              {others.map((offer) => (
                <li key={offer.slug}>
                  <Link href={offer.href}>
                    <span className="mk-other-name">{offer.name}</span>
                    <span className="mk-other-price">{offer.cta} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <CompanyFooter />
    </div>
  );
}

/** URL slugs and offer slugs differ; one map beats two sources of truth. */
function slugToOffer(slug: string): string {
  return slug === "sites-web" ? "sites" : slug;
}
