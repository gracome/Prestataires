/**
 * The trades the platform serves.
 *
 * The landing page used to be photographed entirely in a nail salon, which
 * quietly told every hairdresser and every barber that the product was not for
 * them. The fix is not to find neutral photographs — there are none — but to
 * let a visitor pick her own trade and see the product answer in her own
 * vocabulary.
 *
 * So this table is read twice: once by the "pour qui" strip, which simply
 * names every trade, and once by the demo studio, which borrows one trade's
 * services, prices and wording to compose a site in front of her.
 *
 * Prices are West African CFA francs and are meant to look plausible in
 * Cotonou, not to be authoritative: they are placeholders a visitor
 * immediately overwrites in her head with her own.
 */

export type TradeService = {
  name: string;
  /** Monthly-agnostic: this is the price of one appointment, in F CFA. */
  price: number;
  /** Minutes. Shown as "1 h 30" so a visitor reads it the way she says it. */
  minutes: number;
};

export type Trade = {
  id: string;
  /** What the trade is called on a button. */
  label: string;
  /** What a practitioner of it is called, for sentences about her. */
  practitioner: string;
  /** Most of these trades serve women; barbering mostly does not. */
  clients: "clientes" | "clients";
  /** A plausible business name, pre-filled so the preview is never empty. */
  sampleName: string;
  tagline: string;
  services: readonly TradeService[];
  /** The accent the preview wears. Each trade gets a different one so the
   *  picker visibly changes something before a visitor has typed anything. */
  accent: string;
};

export const TRADES: readonly Trade[] = [
  {
    id: "ongles",
    label: "Onglerie",
    practitioner: "prothésiste ongulaire",
    clients: "clientes",
    sampleName: "Studio Amara",
    tagline: "Ongles, mains et pieds — sur rendez-vous",
    accent: "#e0568a",
    services: [
      { name: "Pose gel complète", price: 15000, minutes: 120 },
      { name: "Remplissage", price: 10000, minutes: 90 },
      { name: "Manucure simple", price: 5000, minutes: 45 },
      { name: "Nail art (par ongle)", price: 1000, minutes: 15 },
    ],
  },
  {
    id: "coiffure",
    label: "Coiffure & tresses",
    practitioner: "coiffeuse",
    clients: "clientes",
    sampleName: "Maison Lokossa",
    tagline: "Tresses, tissages et soins capillaires",
    accent: "#a855c7",
    services: [
      { name: "Tresses collées", price: 12000, minutes: 180 },
      { name: "Pose de tissage", price: 20000, minutes: 150 },
      { name: "Soin profond + brushing", price: 8000, minutes: 75 },
      { name: "Coupe femme", price: 6000, minutes: 45 },
    ],
  },
  {
    id: "cils",
    label: "Cils & sourcils",
    practitioner: "technicienne cils",
    clients: "clientes",
    sampleName: "Regard Atelier",
    tagline: "Extensions de cils et restructuration des sourcils",
    accent: "#7a5cd6",
    services: [
      { name: "Extensions cil à cil", price: 18000, minutes: 120 },
      { name: "Volume russe", price: 25000, minutes: 150 },
      { name: "Remplissage 3 semaines", price: 12000, minutes: 90 },
      { name: "Restructuration sourcils", price: 4000, minutes: 30 },
    ],
  },
  {
    id: "maquillage",
    label: "Maquillage",
    practitioner: "maquilleuse",
    clients: "clientes",
    sampleName: "Éclat Studio",
    tagline: "Maquillage mariée, soirée et séance photo",
    accent: "#d6336c",
    services: [
      { name: "Maquillage mariée", price: 45000, minutes: 120 },
      { name: "Maquillage soirée", price: 15000, minutes: 60 },
      { name: "Séance photo", price: 20000, minutes: 75 },
      { name: "Cours d'auto-maquillage", price: 25000, minutes: 120 },
    ],
  },
  {
    id: "esthetique",
    label: "Soins & esthétique",
    practitioner: "esthéticienne",
    clients: "clientes",
    sampleName: "Institut Zinsou",
    tagline: "Soins du visage, du corps et épilation",
    accent: "#2f9e8f",
    services: [
      { name: "Soin visage éclat", price: 15000, minutes: 75 },
      { name: "Gommage corps", price: 12000, minutes: 60 },
      { name: "Épilation jambes complètes", price: 8000, minutes: 45 },
      { name: "Massage relaxant", price: 18000, minutes: 90 },
    ],
  },
  {
    id: "barbier",
    label: "Barbier",
    practitioner: "barbier",
    clients: "clients",
    sampleName: "Le Comptoir Barbier",
    tagline: "Coupe, barbe et rasage traditionnel",
    accent: "#2c6fb5",
    services: [
      { name: "Coupe + contours", price: 3000, minutes: 40 },
      { name: "Taille de barbe", price: 2000, minutes: 25 },
      { name: "Rasage à l'ancienne", price: 4000, minutes: 45 },
      { name: "Coupe enfant", price: 2000, minutes: 30 },
    ],
  },
] as const;

export function tradeById(id: string): Trade {
  return TRADES.find((trade) => trade.id === id) ?? TRADES[0];
}

/** 90 -> "1 h 30", 45 -> "45 min". How a provider says it out loud. */
export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`;
}

/** 15000 -> "15 000", grouped with a no-break space so it never wraps. */
export function fcfa(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/[  \s]/g, " ");
}
