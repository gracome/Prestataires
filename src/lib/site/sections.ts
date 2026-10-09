/**
 * What a provider's home page is made of, and in which order.
 *
 * Every site used to be the same page with different words in it. The order
 * lives here so she can decide that her work comes before her prices, or that
 * her opening hours belong at the top because that is what people ask her all
 * day.
 *
 * Two rules hold the whole thing together. A key the code no longer knows is
 * ignored, and a section missing from her list falls back in at its natural
 * place. Between them, reordering can never make a section vanish, and adding
 * a new section to the platform never requires touching a single saved order.
 */

export type SectionKey =
  | "services"
  | "gallery"
  | "reviews"
  | "about"
  | "commitments"
  | "hours"
  | "location"
  | "faq"
  | "contact";

export type SectionDefinition = {
  key: SectionKey;
  label: string;
  /** What she reads when deciding whether to keep it. */
  hint: string;
  /** The visibility switch that governs it, when it has one. */
  toggle?:
    | "showServices"
    | "showGallery"
    | "showAbout"
    | "showHours"
    | "showLocation"
    | "showFaq"
    | "showContact";
};

/**
 * The order the platform ships.
 *
 * The hero is not in here: it is the page's opening and has no meaning
 * anywhere else, so it is never moved and never switched off.
 */
export const SECTIONS: SectionDefinition[] = [
  {
    key: "services",
    label: "Prestations",
    hint: "Ce que vous proposez, avec les tarifs si vous les affichez.",
    toggle: "showServices",
  },
  {
    key: "gallery",
    label: "Réalisations",
    hint: "Un aperçu de vos photos, avec un lien vers la galerie complète.",
    toggle: "showGallery",
  },
  {
    key: "reviews",
    label: "Avis",
    hint: "La note moyenne et les derniers avis de vos clientes. Apparaît dès le premier avis.",
  },
  {
    key: "about",
    label: "À propos",
    hint: "Votre présentation, votre portrait et votre citation.",
    toggle: "showAbout",
  },
  {
    key: "commitments",
    label: "Vos engagements",
    hint: "Les trois promesses affichées en bandeau.",
  },
  {
    key: "hours",
    label: "Horaires",
    hint: "Vos jours et heures d'ouverture.",
    toggle: "showHours",
  },
  {
    key: "location",
    label: "Localisation",
    hint: "Votre adresse et le lien vers la carte.",
    toggle: "showLocation",
  },
  {
    key: "faq",
    label: "Questions fréquentes",
    hint: "Vos réponses aux questions qui reviennent.",
    toggle: "showFaq",
  },
  {
    key: "contact",
    label: "Contact",
    hint: "Comment vous joindre, et le bouton de réservation.",
    toggle: "showContact",
  },
];

const KNOWN = new Set<string>(SECTIONS.map((section) => section.key));
const NATURAL = SECTIONS.map((section) => section.key);

/**
 * Turn a saved order into one that can be rendered.
 *
 * Unknown keys are dropped, duplicates keep only their first appearance, and
 * anything she never placed is appended in the platform's order. The result
 * always holds every section exactly once, whatever was stored.
 */
export function resolveSectionOrder(
  saved: readonly string[] | null | undefined,
): SectionKey[] {
  const seen = new Set<SectionKey>();
  const order: SectionKey[] = [];

  for (const key of saved ?? []) {
    if (!KNOWN.has(key)) continue;
    const typed = key as SectionKey;
    if (seen.has(typed)) continue;
    seen.add(typed);
    order.push(typed);
  }

  for (const key of NATURAL) {
    if (!seen.has(key)) order.push(key);
  }

  return order;
}

/** Whether a saved order is simply the one the platform ships. */
export function isNaturalOrder(saved: readonly string[] | null | undefined): boolean {
  const resolved = resolveSectionOrder(saved);
  return resolved.every((key, index) => key === NATURAL[index]);
}

export function sectionLabel(key: SectionKey): string {
  return SECTIONS.find((section) => section.key === key)?.label ?? key;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export type LayoutVariant = "classic" | "editorial" | "minimal";

export const LAYOUTS: Array<{
  value: LayoutVariant;
  label: string;
  hint: string;
}> = [
  {
    value: "classic",
    label: "Classique",
    hint: "Grande photo d'accueil, titres centrés. Le plus chaleureux.",
  },
  {
    value: "editorial",
    label: "Éditorial",
    hint: "Texte aligné à gauche, titres larges. Fait magazine.",
  },
  {
    value: "minimal",
    label: "Épuré",
    hint: "Beaucoup de blanc, petits titres, photo discrète.",
  },
];

export function isLayoutVariant(value: string): value is LayoutVariant {
  return LAYOUTS.some((layout) => layout.value === value);
}

export function asLayoutVariant(value: string | null | undefined): LayoutVariant {
  return value && isLayoutVariant(value) ? value : "classic";
}
