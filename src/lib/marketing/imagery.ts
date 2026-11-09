/**
 * Photography for the platform's own pages.
 *
 * The marketing site is about beauty work, so it has to show beauty work: a
 * page of coloured blocks and drawn mock screens reads as a wireframe, however
 * carefully the palette was chosen. These are the same Unsplash photographs
 * the demo data uses, which means they are already known to load and to sit
 * well with the palette.
 *
 * Two of the original eight are not referenced any more. One is multicoloured
 * nail art and one is bright red; both are striking on their own and both
 * fight everything else on a page that is trying to be calm. They stay in the
 * table because the demo data points at them.
 *
 * They are stand-ins, and they are the wrong stand-ins. Seven of the eight
 * show pale hands and pale skin, which is not what a salon in Porto-Novo looks
 * like. The day there are real providers on the platform, their own
 * photographs belong here instead and will say far more.
 */

const UNSPLASH = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&q=80&auto=format&fit=crop`;

/**
 * The raw photograph ids, so a caller can ask for the width it actually needs.
 * A cover that fills a laptop screen and a thumbnail in a row of three should
 * not download the same file.
 */
const IDS = {
  /** Soft nude nails resting on white fur. Quiet, close, premium. */
  nails: "1610992015732-2449b76344bc",
  /** Multicoloured nail art. Loud; kept for the demo data only. */
  manicure: "1571290274554-6a2eaa771e5f",
  /** Long waved hair against a rose wall, seen from behind. The cover. */
  salon: "1522337360788-8b13dee7a37e",
  /** An esthetician applying a mask. The one photograph with a Black client. */
  care: "1570172619644-dfd03ed5d881",
  /** Red "love" nails. Loud; kept for the demo data only. */
  hands: "1519014816548-bf5fe059798b",
  /** A manicurist's hands at work, mid-gesture. */
  detail: "1632345031435-8727f6897d53",
  /** Grey and white nails on a knit sleeve. Calm. */
  tools: "1607779097040-26e80aa78e66",
  /** A flatlay of palettes and brushes, warm neutrals. */
  portrait: "1512496015851-a90fb38ba796",
} as const;

export type MarketingPhoto = keyof typeof IDS;

/** One photograph at the width it will actually be displayed at. */
export function photo(name: MarketingPhoto, width: number): string {
  return UNSPLASH(IDS[name], width);
}

/**
 * The 900px set, kept because the demo data and the seed script import it by
 * name. New code should call photo() with the width it needs.
 */
export const MARKETING_PHOTOS = Object.fromEntries(
  Object.keys(IDS).map((name) => [name, photo(name as MarketingPhoto, 900)]),
) as Record<MarketingPhoto, string>;
