/**
 * Photography for the platform's own pages.
 *
 * The marketing site is about beauty work, so it has to show beauty work: a
 * page of coloured blocks and emoji reads as a wireframe, however carefully
 * the palette was chosen. These are the same Unsplash photographs the demo
 * data uses, which means they are already known to load and to sit well with
 * the palette.
 *
 * They are stand-ins. The day there are real providers on the platform, their
 * own photographs belong here instead, and will say far more.
 */

const UNSPLASH = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&q=80&auto=format&fit=crop`;

export const MARKETING_PHOTOS = {
  nails: UNSPLASH("1610992015732-2449b76344bc", 900),
  manicure: UNSPLASH("1571290274554-6a2eaa771e5f", 900),
  salon: UNSPLASH("1522337360788-8b13dee7a37e", 900),
  care: UNSPLASH("1570172619644-dfd03ed5d881", 900),
  hands: UNSPLASH("1519014816548-bf5fe059798b", 900),
  detail: UNSPLASH("1632345031435-8727f6897d53", 900),
  tools: UNSPLASH("1607779097040-26e80aa78e66", 900),
  portrait: UNSPLASH("1512496015851-a90fb38ba796", 900),
} as const;

export type MarketingPhoto = keyof typeof MARKETING_PHOTOS;
