/**
 * The company behind the products.
 *
 * The site used to be the Prestataire site. It is the company's site, and
 * Prestataire is its first product — which is a different page with a
 * different job: a visitor arriving here may want a booking platform, or a
 * site built for her, or to learn something. The home page has to let all
 * three through, and send the first of them to /prestataire rather than trying
 * to sell the platform on the doorstep.
 *
 * Everything the company is called lives here, so renaming it is one edit
 * rather than a search across the pages that mention it.
 */

export const COMPANY = {
  /** Displayed in the header, the footer and every page title. */
  name: "Build with Gracias",
  /** One line, under the name. Not a slogan — what the company actually does. */
  tagline: "Studio digital — Porto-Novo, Bénin",
  city: "Porto-Novo",
  country: "Bénin",
  whatsapp: "https://wa.me/22969668879",
  /** Shown as text next to the WhatsApp link, so it can be dialled. */
  phone: "+229 69 66 88 79",
} as const;

export type Offer = {
  slug: string;
  /** Short enough to sit on a card heading. */
  name: string;
  /** What it is, in one sentence, for someone who has never heard of it. */
  summary: string;
  /** Three things it covers. Not features — the shape of the engagement. */
  covers: readonly string[];
  /** Where the card leads. An internal page where one exists, else contact. */
  href: string;
  /** The label on that link, phrased as what happens next. */
  cta: string;
  /** The first product gets a wider card and is named as such. */
  flagship?: boolean;
};

export const OFFERS: readonly Offer[] = [
  {
    slug: "prestataire",
    name: "Prestataire",
    summary:
      "La plateforme de réservation pour les métiers de la beauté : un site à votre image, un agenda qui ne se trompe pas, des acomptes encaissés et vos chiffres au même endroit.",
    covers: [
      "Un site de réservation à votre nom",
      "Agenda, acomptes, caisse et clientes",
      "Abonnement mensuel, sans commission",
    ],
    href: "/prestataire",
    cta: "Découvrir Prestataire",
    flagship: true,
  },
  {
    slug: "sites",
    name: "Sites web sur mesure",
    summary:
      "Un site conçu pour votre activité et pas pour un gabarit : vitrine, boutique, prise de rendez-vous ou application métier, construit puis maintenu.",
    covers: [
      "Vitrine, boutique ou application métier",
      "Nom de domaine, hébergement, mise en ligne",
      "Maintenance et évolutions",
    ],
    href: "/services/sites-web",
    cta: "Parler de votre projet",
  },
  {
    slug: "formations",
    name: "Formations au digital",
    summary:
      "Apprendre à se servir des outils plutôt qu'à les subir : bureautique, réseaux sociaux, vente en ligne, gestion d'une activité depuis un téléphone.",
    covers: [
      "En groupe ou en individuel",
      "Sur place à Porto-Novo et Cotonou, ou à distance",
      "Supports en français, adaptés au terrain",
    ],
    href: "/services/formations",
    cta: "Voir les formations",
  },
] as const;

export function offerBySlug(slug: string): Offer | undefined {
  return OFFERS.find((offer) => offer.slug === slug);
}
