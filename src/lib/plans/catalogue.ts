import type { Plan, PlanFeature } from "@prisma/client";

/**
 * The commercial offer, in one place.
 *
 * The public pricing page, the administration screens and the entitlement
 * checks all read from here, so a price shown to a prospect, a price recorded
 * against a payment and the features actually granted can never drift apart.
 *
 * Amounts are monthly, in minor units of XOF — which has no decimals, so 5000
 * is 5 000 FCFA.
 */

/**
 * A year costs ten months rather than twelve. One rule for every package and
 * every module, so the saving is the same sentence everywhere and nobody has
 * to compare percentages.
 */
export const MONTHS_CHARGED_YEARLY = 10;

export function yearlyPrice(monthly: number): number {
  return monthly * MONTHS_CHARGED_YEARLY;
}

export function monthsInPeriod(period: "MONTHLY" | "YEARLY"): number {
  return period === "YEARLY" ? 12 : 1;
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

type FeatureDefinition = {
  label: string;
  /** Monthly price when bought on its own, on top of any package. */
  monthly: number;
  /**
   * Whether it may be sold today. A feature that is only half built stays out
   * of the public price list until it works end to end, but still exists here
   * so an account can be granted it for testing.
   */
  sellable: boolean;
  /** Shown in the administration screen, to explain what switching it off does. */
  covers: string;
};

export const FEATURES: Record<PlanFeature, FeatureDefinition> = {
  BOOKING: {
    label: "Réservation en ligne",
    monthly: 3000,
    sellable: true,
    covers: "Réservations, calendrier et prise de rendez-vous publique",
  },
  STAFF: {
    label: "Gestion des collaborateurs",
    monthly: 2000,
    sellable: true,
    covers: "Comptes employés, rôles et permissions",
  },
  TILL: {
    label: "Caisse",
    monthly: 1500,
    sellable: true,
    covers: "Ventes au comptoir et recettes du jour",
  },
  DEPOSITS: {
    label: "Gestion des acomptes",
    monthly: 1500,
    sellable: true,
    covers: "Acomptes, instructions de paiement et preuves de paiement",
  },
  GOOGLE_CALENDAR: {
    label: "Google Calendar",
    monthly: 1000,
    sellable: true,
    covers: "Synchronisation avec l'agenda Google",
  },
  QUOTES: {
    label: "Demandes de devis",
    monthly: 1000,
    sellable: true,
    covers: "Estimateur public et suivi des demandes",
  },
  REPORTS: {
    label: "Statistiques",
    monthly: 1000,
    sellable: true,
    covers: "Rapports d'activité et suivi des clients",
  },
  REMINDERS: {
    label: "Rappels automatiques",
    monthly: 1000,
    sellable: true,
    covers: "Rappels envoyés aux clientes avant la séance",
  },
  CUSTOM_DOMAIN: {
    label: "Domaine personnalisé",
    monthly: 2000,
    // Half built: the middleware routes on customDomain, but nothing writes
    // it yet. Kept out of the price list until it can be set from a screen.
    sellable: false,
    covers: "Site servi sur le domaine du prestataire",
  },
};

/** The modules on sale, dearest first, as the public page lists them. */
export function sellableFeatures(): PlanFeature[] {
  return (Object.keys(FEATURES) as PlanFeature[])
    .filter((key) => FEATURES[key].sellable)
    .sort((a, b) => FEATURES[b].monthly - FEATURES[a].monthly);
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

type PlanDefinition = {
  name: string;
  emoji: string;
  monthly: number;
  pitch: string;
  /** The package it builds on, so a card need not repeat the level below. */
  extends?: Plan;
  grants: readonly PlanFeature[];
  /** Selling points that are not gated features, such as the showcase site. */
  extras: readonly string[];
  recommended?: boolean;
};

export const PLANS: Record<Plan, PlanDefinition> = {
  ESSENTIEL: {
    name: "Essentiel",
    emoji: "🤍",
    monthly: 5000,
    pitch: "Pour une présence professionnelle en ligne.",
    grants: [],
    extras: [
      "Site web professionnel personnalisé",
      "Page d'accueil et présentation de l'activité",
      "Services et tarifs",
      "Galerie photos",
      "Horaires d'ouverture et localisation",
      "Contact et WhatsApp",
      "Questions fréquentes",
      "Espace de gestion du site",
    ],
  },
  RENDEZ_VOUS: {
    name: "Rendez-vous",
    emoji: "📅",
    monthly: 7500,
    pitch: "Pour gérer facilement les prises de rendez-vous.",
    extends: "ESSENTIEL",
    recommended: true,
    grants: ["BOOKING", "GOOGLE_CALENDAR"],
    extras: [
      "Gestion des disponibilités et du calendrier",
      "Confirmation et refus des rendez-vous",
      "Confirmations par email",
      "Historique des rendez-vous",
    ],
  },
  BUSINESS: {
    name: "Business",
    emoji: "👑",
    monthly: 12000,
    pitch: "Pour gérer son activité et déléguer certaines tâches.",
    extends: "RENDEZ_VOUS",
    grants: [
      "BOOKING",
      "GOOGLE_CALENDAR",
      "TILL",
      "DEPOSITS",
      "STAFF",
      "QUOTES",
      "REPORTS",
      "REMINDERS",
    ],
    extras: [
      "Ventes au comptoir, tous moyens de paiement",
      "Réception et vérification des preuves de paiement",
      "Suivi des clients",
    ],
  },
};

/** Cheapest first: the order the packages are shown and compared in. */
export const PLAN_ORDER: readonly Plan[] = ["ESSENTIEL", "RENDEZ_VOUS", "BUSINESS"];

export function planLabel(plan: Plan): string {
  return PLANS[plan].name;
}

/**
 * What a card lists under "Tout <niveau précédent>, plus :" — the features and
 * selling points this package adds over the one it extends.
 */
export function planHighlights(plan: Plan): string[] {
  const definition = PLANS[plan];
  const inherited = definition.extends
    ? new Set(PLANS[definition.extends].grants)
    : new Set<PlanFeature>();

  const added = definition.grants
    .filter((feature) => !inherited.has(feature))
    .map((feature) => FEATURES[feature].label);

  return [...added, ...definition.extras];
}

/** What one period of this subscription costs, in minor units. */
export function priceFor(
  plan: Plan,
  period: "MONTHLY" | "YEARLY",
  extraModules: readonly PlanFeature[] = [],
): number {
  const granted = new Set(PLANS[plan].grants);
  const monthly =
    PLANS[plan].monthly +
    extraModules
      .filter((feature) => !granted.has(feature))
      .reduce((total, feature) => total + FEATURES[feature].monthly, 0);

  return period === "YEARLY" ? yearlyPrice(monthly) : monthly;
}
