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
  /**
   * Modules this one is useless without. Online payment with no deposit to
   * take collects nothing; a deposit with no booking attaches to nothing.
   * Buying one therefore buys what it stands on, and is charged for it.
   */
  requires?: readonly PlanFeature[];
  /** Address of its own page, under /modules. */
  slug: string;
  /** One paragraph: what it actually changes, in her words. */
  intro: string;
  /** What it changes for the provider. */
  forProvider: readonly string[];
  /** What it changes for her client — often the part that sells it. */
  forClient: readonly string[];
  /** What she has to do or have for it to work. */
  needs?: readonly string[];
};

export const FEATURES: Record<PlanFeature, FeatureDefinition> = {
  BOOKING: {
    label: "Réservation en ligne",
    slug: "reservation-en-ligne",
    monthly: 3000,
    sellable: true,
    covers: "Réservations, calendrier et prise de rendez-vous publique",
    intro:
      "Vos clientes choisissent une prestation, voient vos vraies disponibilités et réservent elles-mêmes. Vous arrêtez de tenir l'agenda dans WhatsApp.",
    forProvider: [
      "Vos créneaux libres se calculent à partir de vos horaires, de vos absences et des rendez-vous déjà pris.",
      "Deux clientes ne peuvent pas réserver le même créneau, même à la seconde près.",
      "Vous acceptez ou refusez depuis votre téléphone, et l'historique reste consultable.",
    ],
    forClient: [
      "Elle réserve à minuit si elle veut, sans attendre votre réponse.",
      "Elle voit la durée et le tarif avant de confirmer.",
      "Elle reçoit sa confirmation par email, avec le récapitulatif.",
    ],
    needs: ["Avoir renseigné vos horaires et au moins une prestation."],
  },
  STAFF: {
    label: "Gestion des collaborateurs",
    slug: "collaborateurs",
    monthly: 2000,
    sellable: true,
    covers: "Comptes employés, rôles et permissions",
    intro:
      "Donnez un accès à celles qui travaillent avec vous, sans leur ouvrir vos chiffres ni vos coordonnées bancaires.",
    forProvider: [
      "Jusqu'à deux comptes en plus du vôtre.",
      "Une employée gère les rendez-vous, le calendrier, les prestations, les horaires, la galerie et les devis.",
      "Elle ne voit ni le chiffre d'affaires, ni le panier moyen, ni les rapports.",
      "Chaque encaissement à la caisse garde le nom de qui l'a saisi.",
    ],
    forClient: [
      "Quelqu'un répond même quand vous êtes en prestation.",
    ],
  },
  TILL: {
    label: "Caisse",
    slug: "caisse",
    monthly: 1500,
    sellable: true,
    covers: "Ventes au comptoir et recettes du jour",
    intro:
      "Enregistrez ce qui rentre au comptoir, pas seulement ce qui a été réservé en ligne. Dans un salon, le passage spontané est souvent le flux le plus important.",
    forProvider: [
      "Une vente se saisit en quelques secondes, entre deux clientes.",
      "Espèces, mobile money, carte, virement : chaque encaissement garde son moyen de paiement.",
      "La recette du jour additionne les rendez-vous et le comptoir, donc vos chiffres sont enfin complets.",
      "Une cliente de passage reste anonyme si elle le souhaite.",
    ],
    forClient: [],
    needs: ["Fonctionne seule : aucun autre module n'est nécessaire."],
  },
  DEPOSITS: {
    label: "Gestion des acomptes",
    slug: "acomptes",
    requires: ["BOOKING"],
    monthly: 1500,
    sellable: true,
    covers: "Acomptes, instructions de paiement et preuves de paiement",
    intro:
      "Demandez un acompte pour bloquer un créneau. La cliente vous paie directement, envoie sa capture, vous validez.",
    forProvider: [
      "Vous fixez un acompte fixe ou un pourcentage, prestation par prestation.",
      "Vos instructions de paiement — MTN MoMo, Moov Money, virement — s'affichent à la cliente au bon moment.",
      "Vous recevez la preuve de paiement et vous confirmez ou refusez.",
      "Un créneau non payé se libère tout seul au bout du délai que vous avez choisi.",
    ],
    forClient: [
      "Elle paie sur votre propre compte : la plateforme ne touche pas cet argent et ne prélève aucune commission.",
      "Elle sait exactement combien verser et où.",
    ],
    needs: ["La réservation en ligne, à laquelle l'acompte se rattache."],
  },
  GOOGLE_CALENDAR: {
    label: "Google Calendar",
    slug: "google-calendar",
    requires: ["BOOKING"],
    monthly: 1000,
    sellable: true,
    covers: "Synchronisation avec l'agenda Google",
    intro:
      "Vos rendez-vous confirmés arrivent dans votre agenda Google, et vos occupations personnelles bloquent vos créneaux.",
    forProvider: [
      "Un rendez-vous confirmé apparaît dans votre agenda, annulation comprise.",
      "Un empêchement noté dans Google rend le créneau indisponible ici.",
      "Vous gardez un seul agenda à consulter.",
    ],
    forClient: [],
    needs: ["Un compte Google, et la réservation en ligne."],
  },
  QUOTES: {
    label: "Demandes de devis",
    slug: "devis",
    monthly: 1000,
    sellable: true,
    covers: "Estimateur public et suivi des demandes",
    intro:
      "Pour les prestations dont le prix dépend du projet : la cliente répond à quelques questions, obtient une estimation, et vous recevez sa demande.",
    forProvider: [
      "Vous composez vos questions et les fourchettes de prix.",
      "Les demandes arrivent dans un suivi, avec leur statut.",
      "Vous répondez avec un vrai devis, sans échanger dix messages pour cadrer le besoin.",
    ],
    forClient: [
      "Elle a un ordre de prix immédiatement, au lieu d'attendre un rappel.",
    ],
  },
  REPORTS: {
    label: "Statistiques",
    slug: "statistiques",
    monthly: 1000,
    sellable: true,
    covers: "Rapports d'activité et suivi des clients",
    intro:
      "Ce que votre activité a fait sur la période : chiffre, panier moyen, prestations qui marchent, clientes qui reviennent.",
    forProvider: [
      "Comparaison avec la période précédente, pour voir si ça monte.",
      "Répartition par prestation : vous savez ce qui porte votre activité.",
      "Nouvelles clientes et clientes fidèles, distinguées.",
      "Export pour votre comptable.",
    ],
    forClient: [],
    needs: ["Réservé au compte responsable : une employée n'y a pas accès."],
  },
  REMINDERS: {
    label: "Rappels automatiques",
    slug: "rappels",
    requires: ["BOOKING"],
    monthly: 1000,
    sellable: true,
    covers: "Rappels envoyés aux clientes avant la séance",
    intro:
      "Un rappel part la veille et deux heures avant. C'est le moyen le plus simple de réduire les rendez-vous manqués.",
    forProvider: [
      "Rien à déclencher : les rappels partent seuls.",
      "Une cliente empêchée annule à l'avance, et le créneau se libère.",
    ],
    forClient: [
      "Elle n'oublie pas son rendez-vous.",
      "Elle a l'heure, l'adresse et le récapitulatif sous la main.",
    ],
    needs: ["La réservation en ligne."],
  },
  ONLINE_PAYMENT: {
    label: "Paiement en ligne",
    slug: "paiement-en-ligne",
    requires: ["DEPOSITS"],
    monthly: 2500,
    sellable: true,
    covers:
      "Acomptes réglés par carte ou mobile money, encaissés sur le compte FedaPay du prestataire",
    intro:
      "La cliente règle son acompte par carte ou mobile money, sans capture d'écran à envoyer ni vérification de votre part.",
    forProvider: [
      "L'argent arrive sur votre propre compte FedaPay : la plateforme n'y touche pas et ne prélève rien.",
      "Le rendez-vous se confirme tout seul dès le paiement reçu.",
      "Plus de captures à lire ni de paiements à pointer à la main.",
      "Vous l'activez quand vous êtes prête, et vous pouvez revenir au dépôt à tout moment.",
    ],
    forClient: [
      "Elle paie en trois clics, sans quitter la page.",
      "Elle est confirmée immédiatement au lieu d'attendre votre validation.",
    ],
    needs: [
      "Un compte FedaPay à votre nom.",
      "La gestion des acomptes, et donc la réservation en ligne.",
    ],
  },
  CUSTOM_DOMAIN: {
    label: "Domaine personnalisé",
    slug: "domaine",
    monthly: 2000,
    sellable: true,
    covers: "Site servi sur le domaine du prestataire",
    intro:
      "Votre site sur votre propre adresse, au lieu de celle de la plateforme. Vos clientes ne voient que votre nom.",
    forProvider: [
      "Une adresse qui vous appartient, que vous gardez si vous partez.",
      "Le certificat de sécurité est émis automatiquement.",
      "Nous vous donnons les enregistrements à créer chez votre registrar.",
    ],
    forClient: [
      "Elle arrive sur votre adresse, pas sur un lien qui contient le nom d'un logiciel.",
    ],
    needs: ["Acheter le domaine chez un registrar — environ 7 000 FCFA par an."],
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
    monthly: 8000,
    pitch: "Pour prendre des rendez-vous et encaisser les acomptes.",
    extends: "ESSENTIEL",
    recommended: true,
    grants: [
      "BOOKING",
      "GOOGLE_CALENDAR",
      "DEPOSITS",
      "ONLINE_PAYMENT",
      "REMINDERS",
    ],
    extras: [
      "Gestion des disponibilités et du calendrier",
      "Confirmation et refus des rendez-vous",
      "Confirmations et rappels par email",
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
      "DEPOSITS",
      "ONLINE_PAYMENT",
      "REMINDERS",
      "TILL",
      "STAFF",
      "QUOTES",
      "REPORTS",
    ],
    extras: [
      "Ventes au comptoir, tous moyens de paiement",
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
  // What a module stands on is billed with it, unless the package already
  // covers it — otherwise the cheap module would be a way in to the dear one.
  const monthly =
    PLANS[plan].monthly +
    expandRequirements(extraModules)
      .filter((feature) => !granted.has(feature))
      .reduce((total, feature) => total + FEATURES[feature].monthly, 0);

  return period === "YEARLY" ? yearlyPrice(monthly) : monthly;
}

/**
 * Close a set of modules over its dependencies.
 *
 * Buying online payment without deposits would collect nothing, and a deposit
 * with no booking attaches to nothing. Rather than letting someone assemble a
 * combination that cannot work, what a module stands on comes with it — and is
 * charged for, so the cheaper item is not a way in through the back door.
 */
export function expandRequirements(
  features: readonly PlanFeature[],
): PlanFeature[] {
  const resolved = new Set<PlanFeature>();

  const visit = (feature: PlanFeature) => {
    if (resolved.has(feature)) return;
    resolved.add(feature);
    for (const required of FEATURES[feature].requires ?? []) visit(required);
  };

  for (const feature of features) visit(feature);
  return [...resolved];
}

/** What a module needs, named for a screen or a price list. */
export function requirementLabels(feature: PlanFeature): string[] {
  return expandRequirements([feature])
    .filter((other) => other !== feature)
    .map((other) => FEATURES[other].label);
}
