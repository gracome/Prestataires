/**
 * The product, named in one place.
 *
 * This repository is BeautyPrest and nothing else. The studio that builds it
 * has its own site in its own project: a visitor here came for a booking
 * platform, and a page that also sold training and custom websites made her
 * read three offers to find the one she wanted.
 *
 * It was called "Prestataire" until it was called BeautyPrest, and a product
 * renamed once can be renamed again. Everything that says the name out loud —
 * page titles, the "propulsé par" line at the foot of every provider's site,
 * the From of every email — reads it from here.
 */
export const PRODUCT = {
  name: "BeautyPrest",
  /**
   * The baseline. "Domaine" carries both meanings on purpose: the trade she
   * works in, and the domain name her site answers on — the platform sells
   * her both.
   */
  tagline: "Parce que, comme votre domaine, votre business mérite d'être beau.",
  /** The landing page. The product is alone here, so it is the root. */
  path: "/",
} as const;

/**
 * How a human is reached.
 *
 * Kept beside the name rather than in a company module: whoever answers this
 * number answers as BeautyPrest, and a provider who needs help should not
 * have to learn the name of the studio behind it to get an answer.
 */
export const CONTACT = {
  whatsapp: "https://wa.me/22969668879",
  /** Shown as text next to the WhatsApp link, so it can be dialled. */
  phone: "+229 69 66 88 79",
  /**
   * Where the team is, shown on the page and signed at the foot of every
   * letter. Not to be confused with "Africa/Porto-Novo", which appears all
   * over the codebase and is the IANA name for Benin's time zone: the
   * database has no entry for Cotonou, so that identifier stays as it is.
   */
  city: "Cotonou",
  country: "Bénin",
} as const;
