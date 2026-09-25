/**
 * Trades the platform knows how to set up.
 *
 * A new provider should find a site that already looks like her trade rather
 * than an empty shell with someone else's pink in it. Each entry carries a
 * palette, the words used above the fold, and a starter catalogue she can
 * rename, reprice or delete.
 *
 * Nothing here is binding: every field lands in ordinary rows she owns from
 * the first minute. The starter services exist so the booking flow can be
 * tried the same day, not to tell her what to sell.
 */

export type ActivityId =
  | "ongles"
  | "coiffure"
  | "cils-sourcils"
  | "esthetique"
  | "barbier"
  | "tatouage"
  | "bien-etre"
  | "autre";

export type Palette = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  headingFont: string;
  bodyFont: string;
};

export type StarterService = {
  name: string;
  category: string;
  shortDescription: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  /** In whole currency units; converted with the provider's currency. */
  price: number;
  popular?: boolean;
};

export type Activity = {
  id: ActivityId;
  label: string;
  /** Shown to the administrator when choosing. */
  hint: string;
  /** The line above the headline on the public site. */
  eyebrow: string;
  taglineTemplate: string;
  heroCtaLabel: string;
  palette: Palette;
  categories: string[];
  services: StarterService[];
};

const ACTIVITIES: Activity[] = [
  {
    id: "ongles",
    label: "Onglerie",
    hint: "Pose, remplissage, vernis semi-permanent, beauté des pieds.",
    eyebrow: "Prothésiste ongulaire",
    taglineTemplate: "Des mains soignées, un rendez-vous à la fois",
    heroCtaLabel: "Prendre rendez-vous",
    palette: {
      primaryColor: "#B0797A",
      secondaryColor: "#2F2A2B",
      accentColor: "#E8C7A8",
      backgroundColor: "#FBF8F6",
      surfaceColor: "#FFFFFF",
      textColor: "#2B2422",
      mutedTextColor: "#6B5F5A",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
    },
    categories: ["Ongles", "Pieds", "Soins"],
    services: [
      { name: "Pose gel", category: "Ongles", shortDescription: "Une pose complète, tenue trois semaines.", durationMinutes: 90, bufferAfterMinutes: 15, price: 8000, popular: true },
      { name: "Remplissage gel", category: "Ongles", shortDescription: "L'entretien de votre pose précédente.", durationMinutes: 75, bufferAfterMinutes: 15, price: 6000 },
      { name: "Vernis semi-permanent", category: "Ongles", shortDescription: "Couleur brillante qui ne s'écaille pas.", durationMinutes: 45, bufferAfterMinutes: 10, price: 5000 },
      { name: "Dépose", category: "Ongles", shortDescription: "Retrait en douceur, sans abîmer l'ongle.", durationMinutes: 30, bufferAfterMinutes: 10, price: 2000 },
      { name: "Beauté des pieds", category: "Pieds", shortDescription: "Gommage, soin des cuticules et vernis.", durationMinutes: 60, bufferAfterMinutes: 15, price: 7000 },
    ],
  },
  {
    id: "coiffure",
    label: "Coiffure",
    hint: "Tresses, tissage, coupe, soin, coiffure afro ou mixte.",
    eyebrow: "Salon de coiffure",
    taglineTemplate: "Votre coiffure, faite pour durer",
    heroCtaLabel: "Réserver mon créneau",
    palette: {
      primaryColor: "#7B4B2A",
      secondaryColor: "#241C17",
      accentColor: "#D9A066",
      backgroundColor: "#FAF6F1",
      surfaceColor: "#FFFFFF",
      textColor: "#241C17",
      mutedTextColor: "#6A5B4E",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
    },
    categories: ["Tresses et nattes", "Tissage et perruques", "Coupe et brushing", "Soins"],
    services: [
      { name: "Tresses collées", category: "Tresses et nattes", shortDescription: "Nattes plaquées, motif au choix.", durationMinutes: 180, bufferAfterMinutes: 20, price: 12000, popular: true },
      { name: "Twists", category: "Tresses et nattes", shortDescription: "Vanilles souples sur cheveux naturels.", durationMinutes: 210, bufferAfterMinutes: 20, price: 15000 },
      { name: "Pose de tissage", category: "Tissage et perruques", shortDescription: "Pose complète, mèches non fournies.", durationMinutes: 150, bufferAfterMinutes: 20, price: 18000 },
      { name: "Coupe et brushing", category: "Coupe et brushing", shortDescription: "Coupe, lavage et mise en forme.", durationMinutes: 60, bufferAfterMinutes: 15, price: 7000 },
      { name: "Soin profond", category: "Soins", shortDescription: "Masque nourrissant et vapeur.", durationMinutes: 60, bufferAfterMinutes: 15, price: 8000 },
    ],
  },
  {
    id: "cils-sourcils",
    label: "Cils et sourcils",
    hint: "Extensions de cils, rehaussement, restructuration des sourcils.",
    eyebrow: "Experte cils et sourcils",
    taglineTemplate: "Un regard qui se passe de maquillage",
    heroCtaLabel: "Réserver ma pose",
    palette: {
      primaryColor: "#8C6A9B",
      secondaryColor: "#2A2430",
      accentColor: "#E3C9D8",
      backgroundColor: "#FAF7FA",
      surfaceColor: "#FFFFFF",
      textColor: "#2A2430",
      mutedTextColor: "#6B6070",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
    },
    categories: ["Cils", "Sourcils"],
    services: [
      { name: "Extensions cil à cil", category: "Cils", shortDescription: "Un faux cil sur chaque cil naturel.", durationMinutes: 120, bufferAfterMinutes: 15, price: 15000, popular: true },
      { name: "Volume russe", category: "Cils", shortDescription: "Plusieurs fibres par cil, effet dense.", durationMinutes: 150, bufferAfterMinutes: 15, price: 20000 },
      { name: "Remplissage cils", category: "Cils", shortDescription: "L'entretien, trois semaines après la pose.", durationMinutes: 75, bufferAfterMinutes: 15, price: 9000 },
      { name: "Rehaussement de cils", category: "Cils", shortDescription: "Vos cils recourbés, sans extension.", durationMinutes: 60, bufferAfterMinutes: 10, price: 10000 },
      { name: "Restructuration des sourcils", category: "Sourcils", shortDescription: "Ligne dessinée puis épilée au fil.", durationMinutes: 30, bufferAfterMinutes: 10, price: 4000 },
    ],
  },
  {
    id: "esthetique",
    label: "Esthétique et soins du visage",
    hint: "Soins visage, épilation, gommage, maquillage.",
    eyebrow: "Institut de beauté",
    taglineTemplate: "Prendre soin de vous, vraiment",
    heroCtaLabel: "Réserver un soin",
    palette: {
      primaryColor: "#6E8B74",
      secondaryColor: "#25302A",
      accentColor: "#D8C3A5",
      backgroundColor: "#F7F9F6",
      surfaceColor: "#FFFFFF",
      textColor: "#25302A",
      mutedTextColor: "#5F6C63",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
    },
    categories: ["Visage", "Épilation", "Corps", "Maquillage"],
    services: [
      { name: "Soin visage éclat", category: "Visage", shortDescription: "Nettoyage, gommage, masque et massage.", durationMinutes: 75, bufferAfterMinutes: 15, price: 15000, popular: true },
      { name: "Nettoyage de peau", category: "Visage", shortDescription: "Extraction des imperfections en profondeur.", durationMinutes: 60, bufferAfterMinutes: 15, price: 12000 },
      { name: "Épilation jambes complètes", category: "Épilation", shortDescription: "À la cire, jambes entières.", durationMinutes: 45, bufferAfterMinutes: 10, price: 8000 },
      { name: "Gommage corps", category: "Corps", shortDescription: "Peau lissée, suivi d'un lait hydratant.", durationMinutes: 45, bufferAfterMinutes: 15, price: 10000 },
      { name: "Maquillage jour", category: "Maquillage", shortDescription: "Pour un entretien, un déjeuner, une photo.", durationMinutes: 45, bufferAfterMinutes: 10, price: 10000 },
    ],
  },
  {
    id: "barbier",
    label: "Barbier",
    hint: "Coupe homme, taille de barbe, rasage traditionnel.",
    eyebrow: "Barbier",
    taglineTemplate: "Coupe nette, barbe dessinée",
    heroCtaLabel: "Réserver ma coupe",
    palette: {
      primaryColor: "#2F4858",
      secondaryColor: "#15202A",
      accentColor: "#C08B4F",
      backgroundColor: "#F5F6F7",
      surfaceColor: "#FFFFFF",
      textColor: "#15202A",
      mutedTextColor: "#5A6772",
      headingFont: "Inter",
      bodyFont: "Inter",
    },
    categories: ["Coupe", "Barbe", "Forfaits"],
    services: [
      { name: "Coupe homme", category: "Coupe", shortDescription: "Tondeuse et ciseaux, contours nets.", durationMinutes: 30, bufferAfterMinutes: 10, price: 3000, popular: true },
      { name: "Coupe enfant", category: "Coupe", shortDescription: "Moins de douze ans.", durationMinutes: 25, bufferAfterMinutes: 10, price: 2000 },
      { name: "Taille de barbe", category: "Barbe", shortDescription: "Dessin, égalisation et huile.", durationMinutes: 25, bufferAfterMinutes: 5, price: 2500 },
      { name: "Rasage à l'ancienne", category: "Barbe", shortDescription: "Serviette chaude et rasoir droit.", durationMinutes: 40, bufferAfterMinutes: 10, price: 4000 },
      { name: "Coupe et barbe", category: "Forfaits", shortDescription: "Les deux dans le même rendez-vous.", durationMinutes: 55, bufferAfterMinutes: 10, price: 5000 },
    ],
  },
  {
    id: "tatouage",
    label: "Tatouage et piercing",
    hint: "Travail sur devis, projets personnalisés.",
    eyebrow: "Studio de tatouage",
    taglineTemplate: "Votre projet, dessiné pour vous",
    heroCtaLabel: "Parler de mon projet",
    palette: {
      primaryColor: "#3A3A3C",
      secondaryColor: "#121213",
      accentColor: "#B3452F",
      backgroundColor: "#F4F4F5",
      surfaceColor: "#FFFFFF",
      textColor: "#121213",
      mutedTextColor: "#5E5E61",
      headingFont: "Inter",
      bodyFont: "Inter",
    },
    categories: ["Tatouage", "Piercing", "Retouches"],
    services: [
      { name: "Petit tatouage", category: "Tatouage", shortDescription: "Jusqu'à la taille d'une paume.", durationMinutes: 90, bufferAfterMinutes: 30, price: 25000, popular: true },
      { name: "Séance d'une demi-journée", category: "Tatouage", shortDescription: "Pour une pièce large ou un projet en plusieurs fois.", durationMinutes: 240, bufferAfterMinutes: 30, price: 80000 },
      { name: "Retouche", category: "Retouches", shortDescription: "Reprise d'un travail fait au studio.", durationMinutes: 45, bufferAfterMinutes: 20, price: 10000 },
      { name: "Piercing lobe", category: "Piercing", shortDescription: "Bijou de première pose compris.", durationMinutes: 30, bufferAfterMinutes: 15, price: 8000 },
    ],
  },
  {
    id: "bien-etre",
    label: "Massage et bien-être",
    hint: "Massages, relaxation, soins du corps.",
    eyebrow: "Praticienne bien-être",
    taglineTemplate: "Une heure pour vous, rien que pour vous",
    heroCtaLabel: "Réserver un massage",
    palette: {
      primaryColor: "#5B7C8D",
      secondaryColor: "#1F2A2F",
      accentColor: "#CBB59C",
      backgroundColor: "#F6F9FA",
      surfaceColor: "#FFFFFF",
      textColor: "#1F2A2F",
      mutedTextColor: "#5B6A72",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
    },
    categories: ["Massages", "Rituels", "Soins du corps"],
    services: [
      { name: "Massage relaxant", category: "Massages", shortDescription: "Corps entier, pression douce.", durationMinutes: 60, bufferAfterMinutes: 20, price: 15000, popular: true },
      { name: "Massage profond", category: "Massages", shortDescription: "Travail sur les tensions du dos et des épaules.", durationMinutes: 75, bufferAfterMinutes: 20, price: 20000 },
      { name: "Massage du dos", category: "Massages", shortDescription: "Ciblé, quand le temps manque.", durationMinutes: 30, bufferAfterMinutes: 15, price: 9000 },
      { name: "Rituel deux heures", category: "Rituels", shortDescription: "Gommage, massage et soin du visage.", durationMinutes: 120, bufferAfterMinutes: 25, price: 32000 },
    ],
  },
  {
    id: "autre",
    label: "Autre activité",
    hint: "Palette neutre, catalogue vide à remplir ensemble.",
    eyebrow: "Sur rendez-vous",
    taglineTemplate: "Prenez rendez-vous en quelques secondes",
    heroCtaLabel: "Prendre rendez-vous",
    palette: {
      primaryColor: "#4A5568",
      secondaryColor: "#1A202C",
      accentColor: "#C8A97E",
      backgroundColor: "#F7F8FA",
      surfaceColor: "#FFFFFF",
      textColor: "#1A202C",
      mutedTextColor: "#5F6B7A",
      headingFont: "Inter",
      bodyFont: "Inter",
    },
    categories: [],
    services: [],
  },
];

const BY_ID = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));

export function listActivities(): Activity[] {
  return ACTIVITIES;
}

/** Falls back to the neutral setup rather than failing on an unknown id. */
export function getActivity(id: string | undefined | null): Activity {
  return (id && BY_ID.get(id as ActivityId)) || BY_ID.get("autre")!;
}

export function isActivityId(value: string): value is ActivityId {
  return BY_ID.has(value as ActivityId);
}
