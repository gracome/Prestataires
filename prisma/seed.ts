import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

/**
 * Demo data.
 *
 * Creates one complete provider so the whole journey can be walked end to end:
 * a showcase home page, a prestation catalogue with step-by-step procedures, a
 * portfolio, opening hours, payment instructions and bookings in every
 * interesting state.
 *
 * The photos are Unsplash placeholders. They make the demo look like a real
 * salon; a real provider replaces them with her own work from the dashboard.
 *
 * Safe to re-run: everything is keyed on the provider slug and upserted.
 */

const prisma = new PrismaClient();

const SLUG = "belle-mains";
const OWNER_EMAIL = "demo@prestataire.test";
const OWNER_PASSWORD = "Demo2025Pass";

/** Unsplash delivery URL, sized and cropped on their side. */
const photo = (id: string, width = 1200): string =>
  `https://images.unsplash.com/photo-${id}?w=${width}&q=80&auto=format&fit=crop`;

const PHOTOS = {
  cover: "1604654894610-df63bc536371",
  portrait: "1487412947147-5cebf100ffc2",
  poseGel: "1610992015732-2449b76344bc",
  semiPermanent: "1522337360788-8b13dee7a37e",
  remplissage: "1632345031435-8727f6897d53",
  depose: "1600948836101-f9ffda59d250",
  pieds: "1607779097040-26e80aa78e66",
  nailArt: "1519014816548-bf5fe059798b",
  gallery: [
    "1571290274554-6a2eaa771e5f",
    "1570172619644-dfd03ed5d881",
    "1512496015851-a90fb38ba796",
    "1595476108010-b4d1f102b1b1",
    "1516975080664-ed2fc6a32937",
    "1560066984-138dadb4c035",
    "1503951914875-452162b0f3f1",
  ],
} as const;

async function main(): Promise<void> {
  const provider = await prisma.provider.upsert({
    where: { slug: SLUG },
    update: { coverImageUrl: photo(PHOTOS.cover, 1800), tagline: "Prothésiste ongulaire" },
    create: {
      slug: SLUG,
      status: "ACTIVE",
      businessName: "Belle Mains Studio",
      ownerName: "Aïcha Doumbouya",
      tagline: "Prothésiste ongulaire",
      coverImageUrl: photo(PHOTOS.cover, 1800),
      description: [
        "Belle Mains Studio est un salon dédié à la beauté des mains et des pieds, installé à Cotonou depuis 2019.",
        "Chaque prestation est réalisée avec du matériel stérilisé et des produits professionnels. Je prends le temps qu'il faut : pas de rendez-vous qui se chevauchent, pas de travail bâclé.",
        "La réservation se fait en ligne, et un acompte confirme définitivement votre créneau.",
      ].join("\n\n"),
      email: OWNER_EMAIL,
      phone: "+229 97 12 34 56",
      whatsappPhone: "+229 97 12 34 56",
      whatsappPrefill:
        "Bonjour, je souhaite avoir des informations concernant une réservation.",
      addressLine: "Rue 12.045, Haie Vive",
      city: "Cotonou",
      country: "Bénin",
      timezone: "Africa/Porto-Novo",
      locale: "fr",
      currency: "XOF",
    },
  });

  await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { providerId: provider.id },
    create: {
      providerId: provider.id,
      email: OWNER_EMAIL,
      name: "Aïcha Doumbouya",
      role: "PROVIDER",
      passwordHash: await bcrypt.hash(OWNER_PASSWORD, 12),
    },
  });

  await prisma.theme.upsert({
    where: { providerId: provider.id },
    update: {},
    create: {
      providerId: provider.id,
      primaryColor: "#B0797A",
      secondaryColor: "#2F2A2B",
      accentColor: "#E8C7A8",
      backgroundColor: "#FBF8F6",
      surfaceColor: "#FFFFFF",
      textColor: "#2B2422",
      mutedTextColor: "#6B5F5A",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
      buttonRadius: "full",
      layoutVariant: "classic",
    },
  });

  const siteContent = {
    heroEyebrow: "Prothésiste ongulaire · Cotonou",
    heroHeadline: "Des mains soignées, sans attendre son tour",
    heroSubheadline:
      "Choisissez votre prestation, voyez le déroulé et le tarif à l'avance, réservez votre créneau en ligne. Un acompte confirme le rendez-vous, et vous recevez tout par email.",
    heroCtaLabel: "Réserver mon créneau",
    aboutTitle: "Six ans à soigner les mains de Cotonou",
    aboutQuote:
      "Une cliente ne repart jamais d'ici avec un travail que je ne montrerais pas.",
    aboutPortraitUrl: photo(PHOTOS.portrait, 900),
    servicesIntro:
      "Vous n'avez pas besoin de connaître le nom exact. Regardez la photo, ouvrez la fiche qui vous parle : vous y trouverez le déroulé complet, la durée réelle et ce qui est compris dans le prix.",
    realisationsIntro:
      "Chaque photo est un travail réalisé au studio. Touchez une image pour l'agrandir, puis suivez le lien vers la prestation correspondante.",
    showQuoteRequest: true,
    showRealisations: true,
    seoTitle: "Belle Mains Studio — pose d'ongles et nail art à Cotonou",
    seoDescription:
      "Prothésiste ongulaire à Cotonou. Pose gel, semi-permanent, nail art et soins des mains. Réservation en ligne, acompte par Mobile Money.",
  };

  await prisma.siteSettings.upsert({
    where: { providerId: provider.id },
    update: siteContent,
    create: { providerId: provider.id, ...siteContent },
  });

  await prisma.bookingSettings.upsert({
    where: { providerId: provider.id },
    update: {},
    create: {
      providerId: provider.id,
      bookingEnabled: true,
      slotGranularityMinutes: 30,
      bufferAfterMinutes: 10,
      minLeadTimeMinutes: 120,
      maxAdvanceDays: 60,
      holdDurationMinutes: 30,
      proofDeadlineMinutes: 30,
      verificationDeadlineMinutes: 120,
      requireCustomerEmail: true,
      allowCustomerCancellation: true,
      cancellationNoticeHours: 24,
      cancellationPolicy:
        "Toute annulation moins de 24 h avant le rendez-vous entraîne la perte de l'acompte.",
      bookingTerms:
        "Merci d'arriver les ongles démaquillés et de prévenir en cas de retard de plus de 15 minutes.",
    },
  });

  // --- Opening hours: closed Sunday and Monday, lunch break on the rest. ---
  const hours = [
    { dayOfWeek: 0, active: false, openMinute: 540, closeMinute: 1080 },
    { dayOfWeek: 1, active: false, openMinute: 540, closeMinute: 1080 },
    { dayOfWeek: 2, active: true, openMinute: 540, closeMinute: 1080, breakStartMinute: 780, breakEndMinute: 840 },
    { dayOfWeek: 3, active: true, openMinute: 540, closeMinute: 1080, breakStartMinute: 780, breakEndMinute: 840 },
    { dayOfWeek: 4, active: true, openMinute: 540, closeMinute: 1140, breakStartMinute: 780, breakEndMinute: 840 },
    { dayOfWeek: 5, active: true, openMinute: 540, closeMinute: 1140, breakStartMinute: 780, breakEndMinute: 840 },
    { dayOfWeek: 6, active: true, openMinute: 480, closeMinute: 1020 },
  ];

  for (const rule of hours) {
    await prisma.workingHours.upsert({
      where: {
        providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: rule.dayOfWeek },
      },
      update: {},
      create: { providerId: provider.id, ...rule },
    });
  }

  await seedHighlights(provider.id);
  const categories = await seedCategories(provider.id);
  const services = await seedServices(provider.id, categories);
  await seedGallery(provider.id, services, categories);
  await seedEstimator(provider.id);

  await prisma.paymentInstruction.deleteMany({ where: { providerId: provider.id } });
  await prisma.paymentInstruction.createMany({
    data: [
      {
        providerId: provider.id,
        paymentMethod: "MTN MoMo",
        accountNumber: "97 12 34 56",
        accountName: "Aicha Doumbouya",
        instructions:
          "Envoyez le dépôt puis téléversez la capture d'écran de la transaction. Indiquez votre nom en référence si l'application le permet.",
        position: 0,
      },
      {
        providerId: provider.id,
        paymentMethod: "Moov Money",
        accountNumber: "95 65 43 21",
        accountName: "Aicha Doumbouya",
        position: 1,
      },
    ],
  });

  await prisma.faqItem.deleteMany({ where: { providerId: provider.id } });
  await prisma.faqItem.createMany({
    data: [
      {
        providerId: provider.id,
        question: "Je ne connais pas le nom des prestations, comment choisir ?",
        answer:
          "Chaque prestation a sa fiche avec une photo, une explication en langage simple et le déroulé étape par étape. Si vous hésitez encore, écrivez-moi sur WhatsApp en décrivant ce que vous voulez.",
        position: 0,
      },
      {
        providerId: provider.id,
        question: "Pourquoi un acompte est-il demandé ?",
        answer:
          "L'acompte réserve définitivement votre créneau. Il est déduit du prix total, vous ne réglez que le solde sur place.",
        position: 1,
      },
      {
        providerId: provider.id,
        question: "Que se passe-t-il si je n'envoie pas ma preuve de paiement ?",
        answer:
          "Le créneau est gardé 30 minutes. Passé ce délai, il redevient disponible pour d'autres clientes et vous pouvez réserver à nouveau.",
        position: 2,
      },
      {
        providerId: provider.id,
        question: "Puis-je annuler ou décaler mon rendez-vous ?",
        answer:
          "Oui, jusqu'à 24 h avant le rendez-vous, depuis le lien reçu par email. Au-delà, contactez-moi directement sur WhatsApp.",
        position: 3,
      },
    ],
  });

  await prisma.socialLink.deleteMany({ where: { providerId: provider.id } });
  await prisma.socialLink.createMany({
    data: [
      {
        providerId: provider.id,
        platform: "instagram",
        url: "https://instagram.com/bellemains.studio",
        position: 0,
      },
      {
        providerId: provider.id,
        platform: "tiktok",
        url: "https://tiktok.com/@bellemains.studio",
        position: 1,
      },
    ],
  });

  await seedAppointments(provider.id);
  await seedHistory(provider.id);

  console.log(
    [
      "",
      "Demo data ready.",
      "",
      `  Site public     : /${SLUG}`,
      `  Prestations     : /${SLUG}/prestations`,
      `  Réalisations    : /${SLUG}/realisations`,
      `  Tableau de bord : /login`,
      `  Email           : ${OWNER_EMAIL}`,
      `  Mot de passe    : ${OWNER_PASSWORD}`,
      "",
      "  Les photos viennent d'Unsplash et servent d'exemples.",
      "",
    ].join("\n"),
  );
}

async function seedHighlights(providerId: string): Promise<void> {
  await prisma.providerHighlight.deleteMany({ where: { providerId } });
  await prisma.providerHighlight.createMany({
    data: [
      {
        providerId,
        kind: "COMMITMENT",
        meta: "6 ans",
        title: "d'expérience",
        description: "Formée à Abidjan, installée à Cotonou depuis 2019.",
        position: 0,
      },
      {
        providerId,
        kind: "COMMITMENT",
        title: "Matériel stérilisé",
        description:
          "Instruments désinfectés après chaque cliente, limes à usage unique.",
        position: 1,
      },
      {
        providerId,
        kind: "COMMITMENT",
        title: "Un rendez-vous à la fois",
        description: "Pas de créneaux qui se chevauchent, vous ne patientez pas.",
        position: 2,
      },
      {
        providerId,
        kind: "COMMITMENT",
        meta: "8 jours",
        title: "de retouche offerte",
        description: "Un ongle casse dans la semaine ? Je le refais sans frais.",
        position: 3,
      },
      {
        providerId,
        kind: "CREDENTIAL",
        meta: "2018",
        title: "Certificat de prothésie ongulaire",
        description: "Académie Nail Pro, Abidjan.",
        position: 0,
      },
      {
        providerId,
        kind: "CREDENTIAL",
        meta: "2021",
        title: "Spécialisation nail art et 3D",
        description: "Formation intensive, Lagos.",
        position: 1,
      },
      {
        providerId,
        kind: "CREDENTIAL",
        meta: "2023",
        title: "Hygiène et prévention des infections",
        description: "Module professionnel, renouvelé chaque année.",
        position: 2,
      },
    ],
  });
}

/**
 * The guided estimator for nail art, which is the prestation that genuinely
 * cannot be priced from a list. Four questions, a base price, and a 15 % band
 * around the total.
 */
async function seedEstimator(providerId: string): Promise<void> {
  const settings = await prisma.quoteSettings.upsert({
    where: { providerId },
    update: {
      estimatorEnabled: true,
      basePrice: 6000,
      baseDurationMinutes: 60,
      marginPercent: 15,
    },
    create: {
      providerId,
      estimatorEnabled: true,
      basePrice: 6000,
      baseDurationMinutes: 60,
      marginPercent: 15,
      intro:
        "Quelques questions pour cerner votre projet. Le tarif approximatif s'affiche au fur et à mesure, vous savez tout de suite à quoi vous attendre.",
      disclaimer:
        "Fourchette indicative. Aïcha confirme le tarif exact après avoir vu votre inspiration, sous 48 h.",
    },
    select: { id: true },
  });

  // Questions are demo content, rewritten on every seed.
  await prisma.quoteQuestion.deleteMany({ where: { settingsId: settings.id } });

  const questions = [
    {
      label: "Sur combien d'ongles voulez-vous un décor ?",
      helpText: "Le reste des ongles reste en couleur unie.",
      kind: "SINGLE_CHOICE" as const,
      required: true,
      options: [
        { label: "Un ou deux ongles", description: "L'accent classique sur l'annulaire.", priceAdjustment: 1000, durationAdjustment: 15 },
        { label: "Quatre ou cinq ongles", description: "Une main décorée.", priceAdjustment: 2500, durationAdjustment: 30 },
        { label: "Les dix ongles", description: "Décor complet, les deux mains.", priceAdjustment: 5000, durationAdjustment: 60 },
      ],
    },
    {
      label: "Quel niveau de détail ?",
      helpText: "Si vous hésitez, choisissez le niveau intermédiaire.",
      kind: "SINGLE_CHOICE" as const,
      required: true,
      options: [
        { label: "Simple", description: "Points, traits, dégradé, French colorée.", priceAdjustment: 0, durationAdjustment: 0 },
        { label: "Détaillé", description: "Motif peint à main levée, fleurs, motifs géométriques.", priceAdjustment: 2500, durationAdjustment: 30 },
        { label: "Très détaillé ou 3D", description: "Relief, encapsulé, reproduction d'une photo.", priceAdjustment: 5000, durationAdjustment: 60 },
      ],
    },
    {
      label: "Faut-il aussi poser les ongles ?",
      helpText: null,
      kind: "SINGLE_CHOICE" as const,
      required: true,
      options: [
        { label: "Non, j'ai déjà une pose", description: "Le décor se fait sur votre pose actuelle.", priceAdjustment: 0, durationAdjustment: 0 },
        { label: "Oui, avec une pose gel", description: "Construction complète avant le décor.", priceAdjustment: 8000, durationAdjustment: 90 },
        { label: "Oui, sur ongles naturels", description: "Semi-permanent avant le décor.", priceAdjustment: 5000, durationAdjustment: 60 },
      ],
    },
    {
      label: "Des finitions en plus ?",
      helpText: "Plusieurs réponses possibles.",
      kind: "MULTI_CHOICE" as const,
      required: false,
      options: [
        { label: "Strass ou perles", description: null, priceAdjustment: 1500, durationAdjustment: 15 },
        { label: "Effet chrome ou miroir", description: null, priceAdjustment: 2000, durationAdjustment: 15 },
        { label: "Urgence sous 48 h", description: "Créneau dégagé en dehors des horaires habituels.", priceAdjustment: 3000, durationAdjustment: 0 },
      ],
    },
  ];

  for (const [index, question] of questions.entries()) {
    const { options, ...rest } = question;
    const row = await prisma.quoteQuestion.create({
      data: { settingsId: settings.id, position: index, ...rest },
      select: { id: true },
    });

    await prisma.quoteOption.createMany({
      data: options.map((option, optionIndex) => ({
        questionId: row.id,
        position: optionIndex,
        ...option,
      })),
    });
  }
}

type SeededService = { id: string; slug: string };

/** Categories come first: the prestations reference them by id. */
async function seedCategories(providerId: string): Promise<Map<string, string>> {
  const names = ["Ongles", "Pieds", "Nail art", "Soins", "Le studio"];
  const byName = new Map<string, string>();

  for (const [index, name] of names.entries()) {
    const row = await prisma.category.upsert({
      where: { providerId_name: { providerId, name } },
      update: { position: index, active: true },
      create: { providerId, name, position: index },
      select: { id: true },
    });
    byName.set(name, row.id);
  }

  return byName;
}

/**
 * Six prestations, each with the fields the public page needs and a real
 * procedure. This is what makes the showcase demonstrable.
 */
async function seedServices(
  providerId: string,
  categories: Map<string, string>,
): Promise<SeededService[]> {
  const definitions = [
    {
      slug: "pose-gel",
      name: "Pose gel",
      categoryName: "Ongles",
      imageUrl: photo(PHOTOS.poseGel),
      popular: true,
      shortDescription:
        "Des ongles longs et solides, façonnés sur mesure, qui tiennent trois à quatre semaines.",
      description:
        "La pose gel consiste à construire l'ongle avec un gel durci sous lampe UV. On obtient une longueur et une forme choisies, beaucoup plus résistantes qu'un vernis classique.\n\nJe travaille sans capsule quand l'ongle naturel le permet, ce qui limite l'agression et facilite la repousse.",
      idealFor:
        "Vous voulez de la longueur sans attendre que vos ongles poussent\nVos ongles se dédoublent ou cassent facilement\nVous cherchez une tenue longue, pour un mariage ou un voyage\nVous en avez assez de refaire votre vernis chaque semaine",
      included:
        "Diagnostic de l'ongle naturel et conseils\nPréparation complète, repousse des cuticules\nConstruction en gel, longueur et forme au choix\nCouleur unie ou French incluse\nHuile nourrissante en finition",
      preparation:
        "Venez les ongles démaquillés, sans vernis ni reste de pose\nÉvitez de couper vos cuticules dans les trois jours qui précèdent\nPrévoyez 1 h 30 sans contrainte : le gel ne se bâcle pas",
      aftercare:
        "Attendez 24 h avant un bain prolongé ou un sauna\nPortez des gants pour la vaisselle et les produits ménagers\nRevenez en remplissage toutes les trois semaines\nNe décollez jamais le gel vous-même, cela arrache l'ongle",
      price: 8000,
      durationMinutes: 90,
      bufferAfterMinutes: 10,
      depositRequired: true,
      depositType: "FIXED" as const,
      depositValue: 3000,
      position: 0,
      steps: [
        {
          title: "Diagnostic et échange",
          description:
            "On regarde ensemble l'état de vos ongles, et vous me montrez ce que vous avez en tête. Je vous dis franchement ce qui est réalisable.",
          durationMinutes: 5,
        },
        {
          title: "Préparation de l'ongle naturel",
          description:
            "Repousse des cuticules, retrait des peaux mortes, ponçage léger de la surface pour que le gel accroche. C'est l'étape qui décide de la tenue.",
          durationMinutes: 15,
        },
        {
          title: "Construction en gel",
          description:
            "Application du gel couche par couche, puis durcissement sous lampe. Je construis la longueur et la courbe demandées.",
          durationMinutes: 35,
        },
        {
          title: "Limage et mise en forme",
          description:
            "Je lime jusqu'à obtenir la forme exacte : amande, carré, ballerine. Les deux mains sont alignées pour être identiques.",
          durationMinutes: 15,
        },
        {
          title: "Couleur et finition",
          description:
            "Pose de la couleur choisie, puis du top coat brillant ou mat. Dernier passage sous lampe.",
          durationMinutes: 15,
        },
        {
          title: "Huile et conseils",
          description:
            "Massage à l'huile de cuticules, et je vous explique comment entretenir la pose jusqu'au remplissage.",
          durationMinutes: 5,
        },
      ],
    },
    {
      slug: "semi-permanent",
      name: "Vernis semi-permanent",
      categoryName: "Ongles",
      imageUrl: photo(PHOTOS.semiPermanent),
      popular: false,
      shortDescription:
        "Une couleur impeccable sur vos ongles naturels, qui ne s'écaille pas pendant deux à trois semaines.",
      description:
        "Le semi-permanent est un vernis durci sous lampe. Il se pose directement sur l'ongle naturel, sans ajouter de longueur ni d'épaisseur.\n\nC'est la solution la plus simple si vos ongles sont déjà à la bonne longueur et que vous voulez juste une couleur qui tient.",
      idealFor:
        "Vos ongles naturels vous conviennent déjà\nVous voulez une couleur qui ne s'écaille pas au bout de deux jours\nVous préférez un rendu naturel et discret\nC'est votre première fois et vous voulez commencer doucement",
      included:
        "Préparation et repousse des cuticules\nBase, deux couches de couleur, top coat\nPlus de 60 teintes disponibles\nHuile nourrissante en finition",
      preparation:
        "Venez sans vernis, ou prévoyez une dépose en supplément\nSi vos ongles sont très courts, laissez-les pousser une semaine",
      aftercare:
        "La tenue est de deux à trois semaines selon votre activité\nHuilez vos cuticules tous les soirs\nNe grattez pas le vernis : passez par une dépose",
      price: 5000,
      durationMinutes: 60,
      depositRequired: true,
      depositType: "PERCENTAGE" as const,
      depositValue: 30,
      position: 1,
      steps: [
        {
          title: "Choix de la couleur",
          description:
            "Vous testez les teintes sur le nuancier, à la lumière du jour. Prenez le temps : vous allez les regarder trois semaines.",
          durationMinutes: 5,
        },
        {
          title: "Préparation",
          description:
            "Repousse des cuticules, mise en forme au chevet, dégraissage de la surface.",
          durationMinutes: 15,
        },
        {
          title: "Base et couleur",
          description:
            "Une base protectrice, puis deux couches fines de couleur. Chaque couche passe sous lampe.",
          durationMinutes: 25,
        },
        {
          title: "Top coat et huile",
          description:
            "Finition brillante ou mate, puis huile de cuticules. Vous repartez les mains sèches.",
          durationMinutes: 10,
        },
      ],
    },
    {
      slug: "remplissage-gel",
      name: "Remplissage gel",
      categoryName: "Ongles",
      imageUrl: photo(PHOTOS.remplissage),
      popular: false,
      shortDescription:
        "L'entretien d'une pose existante : on comble la repousse et on repart pour trois semaines.",
      description:
        "Au bout de trois semaines, l'ongle a poussé et un décalage apparaît à la base. Le remplissage comble cet espace et rééquilibre la pose, sans tout refaire.\n\nC'est moins long et moins cher qu'une nouvelle pose, et bien meilleur pour vos ongles.",
      idealFor:
        "Votre pose gel a trois à quatre semaines\nLa repousse se voit à la base de l'ongle\nLa pose est encore saine, sans décollement important",
      included:
        "Ponçage de la repousse et rééquilibrage\nComblement en gel\nNouvelle couleur au choix\nRéparation d'un ongle cassé si besoin",
      preparation:
        "Venez avec votre pose en place, même si un ongle a sauté\nNe tentez pas de limer vous-même avant de venir",
      aftercare:
        "Même entretien qu'après une pose\nPrévoyez le remplissage suivant dans trois semaines",
      price: 6000,
      durationMinutes: 75,
      depositRequired: true,
      depositType: "FIXED" as const,
      depositValue: 2000,
      position: 2,
      steps: [
        {
          title: "Contrôle de la pose",
          description:
            "Je vérifie chaque ongle : décollements, fissures, ongle manquant. On décide ensemble si un remplissage suffit.",
          durationMinutes: 5,
        },
        {
          title: "Ponçage de la repousse",
          description:
            "Je descends le gel existant pour supprimer la marche à la base et affiner l'épaisseur.",
          durationMinutes: 25,
        },
        {
          title: "Comblement",
          description:
            "Nouveau gel sur la zone de repousse, puis remise à niveau de l'ensemble pour un rendu régulier.",
          durationMinutes: 25,
        },
        {
          title: "Couleur et finition",
          description: "Couleur au choix, top coat, huile de cuticules.",
          durationMinutes: 20,
        },
      ],
    },
    {
      slug: "depose",
      name: "Dépose",
      categoryName: "Ongles",
      imageUrl: photo(PHOTOS.depose),
      popular: false,
      shortDescription:
        "Le retrait en douceur d'une pose gel ou d'un semi-permanent, sans abîmer l'ongle.",
      description:
        "La dépose retire proprement une pose existante. Faite correctement, elle laisse l'ongle naturel intact ; arrachée à la maison, elle emporte plusieurs couches d'ongle.\n\nSi vous enchaînez avec une nouvelle pose le même jour, la dépose est comprise dans celle-ci.",
      idealFor:
        "Vous voulez laisser respirer vos ongles\nVotre pose est trop ancienne pour un remplissage\nVous avez tenté de l'enlever vous-même et ça se passe mal",
      included:
        "Retrait complet du gel ou du semi-permanent\nLimage de remise en forme\nSoin nourrissant sur l'ongle naturel",
      preparation: "Ne tentez rien à la maison : venez la pose telle quelle",
      aftercare:
        "Huilez vos cuticules matin et soir pendant une semaine\nÉvitez le vernis classique pendant quelques jours",
      price: 2000,
      durationMinutes: 30,
      depositRequired: false,
      position: 3,
      steps: [
        {
          title: "Limage de la couche de finition",
          description: "Je retire le top coat pour que le produit de dépose pénètre.",
          durationMinutes: 8,
        },
        {
          title: "Dépose en douceur",
          description:
            "Compresses imbibées sous papillote, le temps que la matière se ramollisse. Rien n'est arraché.",
          durationMinutes: 15,
        },
        {
          title: "Remise en forme et soin",
          description:
            "Limage léger, polissage, puis huile et crème pour réhydrater l'ongle.",
          durationMinutes: 7,
        },
      ],
    },
    {
      slug: "beaute-des-pieds",
      name: "Beauté des pieds",
      categoryName: "Pieds",
      imageUrl: photo(PHOTOS.pieds),
      popular: true,
      shortDescription:
        "Un soin complet des pieds : gommage, coupe, ponçage des callosités et vernis.",
      description:
        "Un soin des pieds de A à Z, pensé pour le climat d'ici : bain, gommage, traitement des callosités et finition vernis.\n\nOn prend le temps sur les talons, qui sont ce qui souffre le plus en saison sèche.",
      idealFor:
        "Vos talons sont secs ou fendillés\nVous portez des sandales ouvertes toute l'année\nVous voulez des pieds nets avant un événement",
      included:
        "Bain de pieds tiède et gommage\nCoupe et mise en forme des ongles\nPonçage des callosités et des talons\nMassage hydratant jusqu'aux mollets\nVernis semi-permanent au choix",
      preparation:
        "Venez avec des chaussures ouvertes si vous prenez un vernis\nSignalez toute plaie, mycose ou ongle incarné avant la séance",
      aftercare:
        "Crème hydratante sur les talons tous les soirs\nRevenez toutes les six semaines pour garder le résultat",
      price: 7000,
      durationMinutes: 75,
      depositRequired: true,
      depositType: "FIXED" as const,
      depositValue: 2500,
      position: 4,
      steps: [
        {
          title: "Bain et gommage",
          description:
            "Bain tiède pour assouplir la peau, puis gommage au sucre sur l'ensemble du pied.",
          durationMinutes: 15,
        },
        {
          title: "Ongles et cuticules",
          description:
            "Coupe droite pour éviter les ongles incarnés, puis repousse des cuticules.",
          durationMinutes: 15,
        },
        {
          title: "Callosités et talons",
          description:
            "Ponçage progressif des zones épaissies. On retire ce qui gêne sans jamais mettre l'épiderme à vif.",
          durationMinutes: 20,
        },
        {
          title: "Massage hydratant",
          description: "Massage à la crème riche, du pied jusqu'au mollet.",
          durationMinutes: 10,
        },
        {
          title: "Vernis",
          description: "Pose du semi-permanent choisi, séchage sous lampe.",
          durationMinutes: 15,
        },
      ],
    },
    {
      slug: "nail-art-sur-mesure",
      name: "Nail art sur mesure",
      categoryName: "Nail art",
      imageUrl: photo(PHOTOS.nailArt),
      popular: false,
      shortDescription:
        "Une création personnalisée : décrivez votre idée, je vous propose un dessin et un tarif.",
      description:
        "Décor peint à main levée, incrustations, effets 3D, dégradés. Le tarif dépend de la complexité et du nombre d'ongles décorés, d'où le devis.\n\nEnvoyez-moi votre inspiration : une photo, une couleur, un thème de mariage. Je vous réponds avec une proposition.",
      idealFor:
        "Vous avez une idée précise en tête\nC'est pour un mariage, un anniversaire ou une séance photo\nVous voulez autre chose qu'une couleur unie",
      included:
        "Échange préalable sur votre idée\nProposition de dessin avant la séance\nDécor sur le nombre d'ongles convenu\nProtection renforcée du décor",
      preparation:
        "Envoyez vos photos d'inspiration au moment de la demande\nPrévoyez large : un décor complexe prend du temps",
      aftercare:
        "Évitez les chocs sur les ongles décorés les premières 24 h\nLes reliefs 3D demandent plus de précautions qu'une couleur unie",
      price: 0,
      priceType: "QUOTE_ONLY" as const,
      durationMinutes: 120,
      depositRequired: false,
      position: 5,
      steps: [
        {
          title: "Vous décrivez votre idée",
          description:
            "Photo d'inspiration, couleurs, occasion. Plus vous êtes précise, plus la proposition sera juste.",
          durationMinutes: null,
        },
        {
          title: "Je vous réponds avec un devis",
          description:
            "Proposition de dessin, durée estimée et tarif. Sous 48 h en général.",
          durationMinutes: null,
        },
        {
          title: "Séance de création",
          description:
            "On réalise le décor ensemble, avec des ajustements possibles en cours de route.",
          durationMinutes: null,
        },
      ],
    },
  ];

  const created: SeededService[] = [];

  for (const definition of definitions) {
    const { steps, categoryName, ...service } = definition;
    const categoryId = categories.get(categoryName) ?? null;

    const row = await prisma.service.upsert({
      where: { providerId_slug: { providerId, slug: service.slug } },
      update: { ...service, categoryId },
      create: { providerId, priceType: "FIXED", categoryId, ...service },
      select: { id: true, slug: true },
    });

    // Steps are rewritten wholesale: they are demo content, not user data.
    await prisma.serviceStep.deleteMany({ where: { serviceId: row.id } });
    await prisma.serviceStep.createMany({
      data: steps.map((step, index) => ({
        serviceId: row.id,
        position: index,
        title: step.title,
        description: step.description,
        durationMinutes: step.durationMinutes ?? null,
      })),
    });

    created.push(row);
  }

  return created;
}

async function seedGallery(
  providerId: string,
  services: SeededService[],
  categories: Map<string, string>,
): Promise<void> {
  const bySlug = new Map(services.map((s) => [s.slug, s.id]));

  const entries: Array<{
    photo: string;
    caption: string;
    category: string;
    service: string | null;
    featured: boolean;
  }> = [
    { photo: PHOTOS.poseGel, caption: "Pose gel amande, nude rosé", category: "Ongles", service: "pose-gel", featured: true },
    { photo: PHOTOS.gallery[0], caption: "French inversée sur pose gel", category: "Ongles", service: "pose-gel", featured: true },
    { photo: PHOTOS.semiPermanent, caption: "Semi-permanent bordeaux", category: "Ongles", service: "semi-permanent", featured: true },
    { photo: PHOTOS.gallery[1], caption: "Dégradé pastel", category: "Nail art", service: "nail-art-sur-mesure", featured: true },
    { photo: PHOTOS.nailArt, caption: "Décor floral peint à la main", category: "Nail art", service: "nail-art-sur-mesure", featured: false },
    { photo: PHOTOS.remplissage, caption: "Remplissage sur pose de trois semaines", category: "Ongles", service: "remplissage-gel", featured: false },
    { photo: PHOTOS.pieds, caption: "Beauté des pieds, finition rouge", category: "Pieds", service: "beaute-des-pieds", featured: false },
    { photo: PHOTOS.gallery[2], caption: "Mains soignées après soin", category: "Soins", service: null, featured: false },
    { photo: PHOTOS.gallery[3], caption: "Ambiance du studio", category: "Le studio", service: null, featured: false },
    { photo: PHOTOS.gallery[4], caption: "Coin préparation", category: "Le studio", service: null, featured: false },
    { photo: PHOTOS.gallery[5], caption: "Poste de travail", category: "Le studio", service: null, featured: false },
    { photo: PHOTOS.gallery[6], caption: "Matériel stérilisé avant chaque cliente", category: "Le studio", service: null, featured: false },
  ];

  await prisma.galleryImage.deleteMany({ where: { providerId } });
  await prisma.galleryImage.createMany({
    data: entries.map((entry, index) => ({
      providerId,
      url: photo(entry.photo, 1000),
      caption: entry.caption,
      categoryId: categories.get(entry.category) ?? null,
      serviceId: entry.service ? (bySlug.get(entry.service) ?? null) : null,
      featured: entry.featured,
      position: index,
    })),
  });
}

/**
 * A handful of bookings covering the states the dashboard has to render:
 * confirmed, waiting for a proof, proof submitted, and one already finished.
 */
async function seedAppointments(providerId: string): Promise<void> {
  const existing = await prisma.appointment.count({ where: { providerId } });
  if (existing > 0) return;

  const services = await prisma.service.findMany({
    where: { providerId, priceType: { not: "QUOTE_ONLY" } },
    orderBy: { position: "asc" },
  });

  if (services.length === 0) return;

  const now = new Date();

  const plans = [
    {
      service: services[0],
      customerName: "Fatou Bello",
      customerPhone: "+229 96 11 22 33",
      customerEmail: "fatou.bello@example.test",
      inHours: 26,
      status: "CONFIRMED" as const,
      paymentStatus: "VERIFIED" as const,
    },
    {
      service: services[1],
      customerName: "Marina Agbo",
      customerPhone: "+229 95 44 55 66",
      customerEmail: "marina.agbo@example.test",
      inHours: 50,
      status: "PAYMENT_PROOF_SUBMITTED" as const,
      paymentStatus: "PROOF_SUBMITTED" as const,
    },
    {
      service: services[2],
      customerName: "Reine Kouassi",
      customerPhone: "+229 94 77 88 99",
      customerEmail: "reine.kouassi@example.test",
      inHours: 74,
      status: "AWAITING_PAYMENT" as const,
      paymentStatus: "PENDING" as const,
    },
    {
      service: services[3],
      customerName: "Sandra Hounkpe",
      customerPhone: "+229 90 00 11 22",
      customerEmail: "sandra.hounkpe@example.test",
      inHours: -48,
      status: "COMPLETED" as const,
      paymentStatus: "NOT_REQUIRED" as const,
    },
  ];

  for (const [index, plan] of plans.entries()) {
    const startsAt = roundToHalfHour(
      new Date(now.getTime() + plan.inHours * 3_600_000),
    );
    const serviceEndsAt = new Date(
      startsAt.getTime() + plan.service.durationMinutes * 60_000,
    );
    const endsAt = new Date(
      serviceEndsAt.getTime() +
        Math.max(plan.service.bufferAfterMinutes, 10) * 60_000,
    );

    const deposit =
      plan.service.depositType === "PERCENTAGE"
        ? Math.round((plan.service.price * plan.service.depositValue) / 100)
        : plan.service.depositRequired
          ? plan.service.depositValue
          : 0;

    const appointment = await prisma.appointment.create({
      data: {
        providerId,
        serviceId: plan.service.id,
        reference: `RDV-DEMO-${String(index + 1).padStart(2, "0")}`,
        accessToken: randomBytes(32).toString("base64url"),
        customerName: plan.customerName,
        customerPhone: plan.customerPhone,
        customerEmail: plan.customerEmail,
        startsAt,
        serviceEndsAt,
        endsAt,
        status: plan.status,
        validationMethod: deposit > 0 ? "MANUAL_PAYMENT" : "NO_DEPOSIT",
        currency: "XOF",
        totalAmount: plan.service.price,
        depositAmount: deposit,
        balanceAmount: plan.service.price - deposit,
        paymentStatus: plan.paymentStatus,
        paymentSubmittedAt:
          plan.status === "PAYMENT_PROOF_SUBMITTED" ? new Date() : null,
        paymentVerifiedAt: plan.paymentStatus === "VERIFIED" ? new Date() : null,
        expiresAt:
          plan.status === "AWAITING_PAYMENT"
            ? new Date(now.getTime() + 25 * 60_000)
            : plan.status === "PAYMENT_PROOF_SUBMITTED"
              ? new Date(now.getTime() + 110 * 60_000)
              : null,
      },
    });

    await prisma.appointmentEvent.create({
      data: {
        appointmentId: appointment.id,
        toStatus: plan.status,
        actor: "system",
        reason: "Jeu de démonstration",
      },
    });
  }
}

/**
 * Four months of past appointments, so the reports screen has something to
 * show and something to compare against.
 *
 * Deterministic: the same seed run twice produces the same history, which
 * keeps the demo figures stable between reloads. Only appointments in the past
 * are created, and they never collide with the live demo bookings because the
 * exclusion constraint would reject an overlap.
 */
async function seedHistory(providerId: string): Promise<void> {
  const already = await prisma.appointment.count({
    where: { providerId, reference: { startsWith: "RDV-HIST" } },
  });
  if (already > 0) return;

  const services = await prisma.service.findMany({
    where: { providerId, priceType: { not: "QUOTE_ONLY" }, active: true },
    orderBy: { position: "asc" },
  });
  if (services.length === 0) return;

  // A stable roster. Each customer keeps her number for good, because that is
  // what the reports count on to tell a regular from a first visit. `joined`
  // is how many days ago she first came, so "nouvelles clientes" over a period
  // means something instead of counting every appointment twice.
  const customers = [
    { name: "Awa Sossou", phone: "+229 97 12 04 58", joined: 120 },
    { name: "Chantal Adjovi", phone: "+229 95 47 90 65", joined: 120 },
    { name: "Grâce Mensah", phone: "+229 96 33 71 20", joined: 120 },
    { name: "Ines Tossou", phone: "+229 98 69 86 76", joined: 120 },
    { name: "Judith Aholou", phone: "+229 94 78 95 56", joined: 120 },
    { name: "Laure Zinsou", phone: "+229 90 25 63 14", joined: 120 },
    { name: "Mireille Gbaguidi", phone: "+229 97 80 42 09", joined: 120 },
    { name: "Nadia Kponou", phone: "+229 96 04 18 77", joined: 120 },
    { name: "Olivia Dossa", phone: "+229 95 61 29 38", joined: 120 },
    { name: "Prisca Ahouandjinou", phone: "+229 91 37 55 62", joined: 120 },
    { name: "Rose Amoussou", phone: "+229 92 91 32 62", joined: 120 },
    { name: "Sylvie Lokossou", phone: "+229 96 36 24 24", joined: 120 },
    { name: "Bernadette Houngbo", phone: "+229 97 45 11 83", joined: 98 },
    { name: "Carine Ayivi", phone: "+229 94 20 67 51", joined: 92 },
    { name: "Delphine Sagbo", phone: "+229 98 13 74 26", joined: 85 },
    { name: "Esther Kpodar", phone: "+229 95 88 30 47", joined: 74 },
    { name: "Fabiola Djossou", phone: "+229 90 72 15 93", joined: 66 },
    { name: "Gisèle Ahonon", phone: "+229 96 59 82 04", joined: 55 },
    { name: "Hortense Bio", phone: "+229 97 26 48 70", joined: 47 },
    { name: "Irène Lawson", phone: "+229 92 64 09 35", joined: 38 },
    { name: "Josiane Akakpo", phone: "+229 95 03 57 81", joined: 31 },
    { name: "Karelle Vodounon", phone: "+229 98 41 96 22", joined: 24 },
    { name: "Lucie Tchibozo", phone: "+229 91 79 34 60", joined: 17 },
    { name: "Marguerite Assogba", phone: "+229 96 17 68 45", joined: 9 },
  ];

  // A small linear congruential generator: reproducible without a dependency.
  let state = 20260924;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)];

  /**
   * Who is in the chair on a given day. Only customers who had already come by
   * then are eligible, and the draw leans gently towards the longest-standing
   * ones: a salon has regulars, but not one customer taking a third of the
   * book. The exponent is what sets that slope.
   */
  const pickCustomer = (dayAgo: number) => {
    const eligible = customers.filter((customer) => customer.joined >= dayAgo);
    const draw = Math.pow(random(), 1.3);
    return eligible[Math.min(eligible.length - 1, Math.floor(draw * eligible.length))];
  };

  const rows = [];
  const now = new Date();

  for (let dayAgo = 120; dayAgo >= 2; dayAgo -= 1) {
    const day = new Date(now.getTime() - dayAgo * 86_400_000);
    const weekday = day.getUTCDay();
    // The demo salon is closed Sunday and Monday.
    if (weekday === 0 || weekday === 1) continue;

    // Two to four appointments a day, more as the months go by so the
    // comparison between periods shows real growth.
    const growth = (120 - dayAgo) / 120;
    const count = 2 + Math.floor(random() * 2 + growth * 1.5);

    for (let slot = 0; slot < count; slot += 1) {
      const service = pick(services);
      const customer = pickCustomer(dayAgo);
      const startsAt = new Date(day);
      startsAt.setUTCHours(8 + slot * 2, slot % 2 === 0 ? 0 : 30, 0, 0);

      const serviceEndsAt = new Date(
        startsAt.getTime() + service.durationMinutes * 60_000,
      );
      const endsAt = new Date(
        serviceEndsAt.getTime() + Math.max(service.bufferAfterMinutes, 10) * 60_000,
      );

      const deposit =
        service.depositType === "PERCENTAGE"
          ? Math.round((service.price * service.depositValue) / 100)
          : service.depositRequired
            ? service.depositValue
            : 0;

      // Roughly one in twelve falls through, which is what a real book looks
      // like: mostly honoured, a few cancellations and the odd no-show.
      const roll = random();
      const status =
        roll > 0.94 ? "CANCELLED" : roll > 0.9 ? "NO_SHOW" : "COMPLETED";

      rows.push({
        providerId,
        serviceId: service.id,
        reference: `RDV-HIST-${String(rows.length + 1).padStart(4, "0")}`,
        accessToken: randomBytes(32).toString("base64url"),
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: null,
        startsAt,
        serviceEndsAt,
        endsAt,
        status: status as "COMPLETED" | "CANCELLED" | "NO_SHOW",
        validationMethod: (deposit > 0 ? "MANUAL_PAYMENT" : "NO_DEPOSIT") as
          | "MANUAL_PAYMENT"
          | "NO_DEPOSIT",
        currency: "XOF",
        totalAmount: service.price,
        depositAmount: deposit,
        balanceAmount: service.price - deposit,
        paymentStatus: (deposit > 0 && status === "COMPLETED"
          ? "VERIFIED"
          : deposit > 0
            ? "PENDING"
            : "NOT_REQUIRED") as "VERIFIED" | "PENDING" | "NOT_REQUIRED",
        cancelledAt: status === "CANCELLED" ? startsAt : null,
        cancelledBy: status === "CANCELLED" ? ("CUSTOMER" as const) : null,
      });
    }
  }

  // createMany skips the rows the exclusion constraint would reject, so a
  // generated overlap cannot abort the whole seed.
  await prisma.appointment.createMany({ data: rows, skipDuplicates: true });

  console.log(`  ${rows.length} rendez-vous d'historique pour les rapports.`);
}

function roundToHalfHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(rounded.getMinutes() < 30 ? 0 : 30, 0, 0);
  return rounded;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
