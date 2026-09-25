import { z } from "zod";
import { isLocalDate } from "./time";

/**
 * Server-side validation (cahier des charges section 23).
 *
 * Every request body and every form submission is parsed here before it
 * reaches a service. Browser validation is a convenience; this is the rule.
 */

/** Phone numbers in the target markets are written many ways; keep the
 *  original for display and normalise only for storage sanity checks. */
const phone = z
  .string()
  .trim()
  .min(6, "Numéro de téléphone trop court.")
  .max(24, "Numéro de téléphone trop long.")
  .regex(
    /^\+?[0-9 ().-]{6,24}$/,
    "Le numéro ne doit contenir que des chiffres, espaces, + ( ) . ou -",
  );

const email = z
  .string()
  .trim()
  .email("Adresse email invalide.")
  .max(180)
  .toLowerCase();

const optionalEmail = z
  .union([email, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

const localDate = z
  .string()
  .refine(isLocalDate, "Date attendue au format AAAA-MM-JJ.");

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur attendue au format #RRGGBB.");

const minuteOfDay = z.coerce.number().int().min(0).max(1440);

/**
 * Checkbox coercion. A FormData checkbox arrives as "on" when ticked and is
 * absent otherwise, while JSON bodies send real booleans. Zod's own boolean
 * coercion cannot be used here: it turns the string "false" into true.
 */
const checkbox = z.preprocess(
  (value) => value === true || value === "true" || value === "on" || value === "1",
  z.boolean(),
);

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1, "Prestation requise."),
  from: localDate,
  to: localDate,
});

export const createBookingSchema = z.object({
  serviceId: z.string().min(1, "Prestation requise."),
  startsAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime()),
  customerName: z
    .string()
    .trim()
    .min(2, "Merci d'indiquer votre nom.")
    .max(120),
  customerPhone: phone,
  customerEmail: optionalEmail,
  customerNote: z.string().trim().max(1000).optional(),
});

export const quoteRequestSchema = z.object({
  serviceId: z.string().min(1).optional(),
  customerName: z.string().trim().min(2, "Merci d'indiquer votre nom.").max(120),
  customerPhone: phone,
  customerEmail: optionalEmail,
  description: z
    .string()
    .trim()
    .min(10, "Décrivez votre besoin en quelques mots.")
    .max(2000),
  budgetAmount: z.coerce.number().int().min(0).optional(),
  preferredDate: localDate.optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe requis.").max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis."),
    newPassword: z.string().min(10, "Au moins 10 caractères."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Provider dashboard
// ---------------------------------------------------------------------------

export const serviceSchema = z
  .object({
    name: z.string().trim().min(2, "Nom de la prestation requis.").max(120),
    description: z.string().trim().max(2000).optional(),
    categoryId: z.string().trim().optional(),
    price: z.coerce.number().int().min(0, "Prix invalide."),
    priceType: z.enum(["FIXED", "STARTING_FROM", "QUOTE_ONLY"]),
    durationMinutes: z.coerce
      .number()
      .int()
      .min(5, "Durée minimale : 5 minutes.")
      .max(12 * 60, "Durée maximale : 12 heures."),
    bufferAfterMinutes: z.coerce.number().int().min(0).max(240).default(0),
    depositRequired: checkbox.default(false),
    depositType: z.enum(["NONE", "FIXED", "PERCENTAGE"]).default("NONE"),
    depositValue: z.coerce.number().int().min(0).default(0),
    active: checkbox.default(true),
    imageUrl: z.string().url().optional().or(z.literal("")),
    // Showcase fields. They carry the prestation page, which is what lets a
    // customer who does not know the trade name understand what she is booking.
    shortDescription: z.string().trim().max(200).optional(),
    idealFor: z.string().trim().max(1500).optional(),
    included: z.string().trim().max(1500).optional(),
    preparation: z.string().trim().max(1500).optional(),
    aftercare: z.string().trim().max(1500).optional(),
    popular: checkbox.default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.depositRequired) return;

    if (data.depositType === "NONE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["depositType"],
        message: "Choisissez un acompte fixe ou en pourcentage.",
      });
    }
    if (data.depositValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["depositValue"],
        message: "Indiquez le montant de l'acompte.",
      });
    }
    if (data.depositType === "PERCENTAGE" && data.depositValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["depositValue"],
        message: "Le pourcentage ne peut pas dépasser 100.",
      });
    }
    if (
      data.depositType === "FIXED" &&
      data.priceType !== "QUOTE_ONLY" &&
      data.depositValue > data.price
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["depositValue"],
        message: "L'acompte ne peut pas dépasser le prix de la prestation.",
      });
    }
  });

export const workingHoursDaySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    active: checkbox,
    openMinute: minuteOfDay,
    closeMinute: minuteOfDay,
    breakStartMinute: minuteOfDay.nullable().optional(),
    breakEndMinute: minuteOfDay.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.active) return;

    if (data.closeMinute <= data.openMinute) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["closeMinute"],
        message: "L'heure de fermeture doit suivre l'heure d'ouverture.",
      });
    }

    const hasStart = data.breakStartMinute != null;
    const hasEnd = data.breakEndMinute != null;

    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["breakStartMinute"],
        message: "Indiquez le début et la fin de la pause.",
      });
      return;
    }

    if (hasStart && hasEnd) {
      const start = data.breakStartMinute as number;
      const end = data.breakEndMinute as number;
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["breakEndMinute"],
          message: "La fin de la pause doit suivre son début.",
        });
      }
      if (start < data.openMinute || end > data.closeMinute) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["breakStartMinute"],
          message: "La pause doit se situer dans les horaires d'ouverture.",
        });
      }
    }
  });

export const workingHoursSchema = z.object({
  days: z.array(workingHoursDaySchema).length(7),
});

export const timeBlockSchema = z
  .object({
    type: z.enum(["TIME_OFF", "HOLIDAY", "MANUAL_BLOCK"]).default("MANUAL_BLOCK"),
    startsAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
    endsAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
    reason: z.string().trim().max(200).optional(),
    allDay: checkbox.default(false),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "La fin doit suivre le début.",
    path: ["endsAt"],
  });

export const paymentInstructionSchema = z.object({
  paymentMethod: z
    .string()
    .trim()
    .min(2, "Indiquez le moyen de paiement (MTN MoMo, Moov Money...).")
    .max(80),
  accountNumber: z.string().trim().min(4, "Numéro requis.").max(40),
  accountName: z.string().trim().min(2, "Nom du bénéficiaire requis.").max(120),
  instructions: z.string().trim().max(1000).optional(),
  active: checkbox.default(true),
});

export const bookingSettingsSchema = z
  .object({
    bookingEnabled: checkbox.default(true),
    slotGranularityMinutes: z.coerce.number().int().min(5).max(240),
    bufferAfterMinutes: z.coerce.number().int().min(0).max(240),
    minLeadTimeMinutes: z.coerce.number().int().min(0).max(30 * 24 * 60),
    maxAdvanceDays: z.coerce.number().int().min(1).max(365),
    holdDurationMinutes: z.coerce.number().int().min(5).max(24 * 60),
    proofDeadlineMinutes: z.coerce.number().int().min(5).max(7 * 24 * 60),
    verificationDeadlineMinutes: z.coerce.number().int().min(5).max(7 * 24 * 60),
    syncToGoogleCalendar: checkbox.default(true),
    blockOnGoogleBusy: checkbox.default(true),
    requireCustomerEmail: checkbox.default(true),
    allowCustomerCancellation: checkbox.default(true),
    cancellationNoticeHours: z.coerce.number().int().min(0).max(720),
    cancellationPolicy: z.string().trim().max(2000).optional(),
    bookingTerms: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => data.slotGranularityMinutes % 5 === 0,
    {
      message: "Le pas des créneaux doit être un multiple de 5 minutes.",
      path: ["slotGranularityMinutes"],
    },
  );

export const providerProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Nom de l'activité requis.").max(120),
  ownerName: z.string().trim().min(2, "Votre nom est requis.").max(120),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  email,
  phone: phone.optional().or(z.literal("")),
  whatsappPhone: phone.optional().or(z.literal("")),
  whatsappPrefill: z.string().trim().max(400).optional(),
  addressLine: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  mapsUrl: z.string().url("Lien de carte invalide.").optional().or(z.literal("")),
  timezone: z.string().trim().min(3).max(64),
  currency: z.string().trim().length(3, "Code devise sur 3 lettres."),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

export const themeSchema = z.object({
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  backgroundColor: hexColor,
  surfaceColor: hexColor,
  textColor: hexColor,
  mutedTextColor: hexColor,
  headingFont: z.string().trim().min(2).max(60),
  bodyFont: z.string().trim().min(2).max(60),
  buttonRadius: z.enum(["none", "small", "medium", "full"]),
  layoutVariant: z.enum(["classic", "editorial", "minimal"]),
});

/**
 * Palette of the provider's own workspace.
 *
 * No contrast rule is enforced here: the dashboard is hers and she decides.
 * The interface warns her when a pair is hard to read, and the status tones
 * swap automatically so the pills stay legible whatever she picks.
 */
export const adminThemeSchema = z.object({
  adminPreset: z.enum(["neutral", "dark", "sand", "site", "custom"]),
  adminBackground: hexColor,
  adminSurface: hexColor,
  adminText: hexColor,
  adminMuted: hexColor,
  adminBorder: hexColor,
  adminAccent: hexColor,
  adminFont: z.string().trim().min(2).max(60),
  adminRadius: z.enum(["none", "small", "medium", "large"]),
});

export const siteSettingsSchema = z.object({
  showAbout: checkbox.default(true),
  showServices: checkbox.default(true),
  showPricing: checkbox.default(true),
  showGallery: checkbox.default(true),
  showHours: checkbox.default(true),
  showLocation: checkbox.default(true),
  showBooking: checkbox.default(true),
  showContact: checkbox.default(true),
  showFaq: checkbox.default(true),
  showQuoteRequest: checkbox.default(false),
  showRealisations: checkbox.default(true),
  heroHeadline: z.string().trim().max(160).optional(),
  heroSubheadline: z.string().trim().max(400).optional(),
  heroEyebrow: z.string().trim().max(80).optional(),
  heroCtaLabel: z.string().trim().max(40).optional(),
  aboutTitle: z.string().trim().max(160).optional(),
  aboutBody: z.string().trim().max(4000).optional(),
  aboutQuote: z.string().trim().max(400).optional(),
  aboutPortraitUrl: z.string().url().optional().or(z.literal("")),
  servicesIntro: z.string().trim().max(600).optional(),
  realisationsIntro: z.string().trim().max(600).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(180).optional(),
  ogImageUrl: z.string().url().optional().or(z.literal("")),
});

export const faqItemSchema = z.object({
  question: z.string().trim().min(4, "Question requise.").max(200),
  answer: z.string().trim().min(2, "Réponse requise.").max(2000),
  active: checkbox.default(true),
});

export const galleryImageSchema = z.object({
  caption: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  serviceId: z.string().trim().optional(),
  featured: checkbox.default(false),
  active: checkbox.default(true),
});

/** One step of a prestation's procedure. */
export const serviceStepSchema = z.object({
  title: z.string().trim().min(2, "Titre de l'étape requis.").max(120),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z
    .union([z.coerce.number().int().min(1).max(600), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  imageUrl: z.string().url("Lien d'image invalide.").optional().or(z.literal("")),
});

// --- Guided quote estimator (section 18) -----------------------------------

export const quoteSettingsSchema = z.object({
  estimatorEnabled: checkbox.default(false),
  basePrice: z.coerce.number().int().min(0, "Prix de départ invalide."),
  baseDurationMinutes: z.coerce.number().int().min(0).max(24 * 60),
  marginPercent: z.coerce
    .number()
    .int()
    .min(0, "La marge ne peut pas être négative.")
    .max(60, "Une marge au-delà de 60 % ne veut plus rien dire."),
  intro: z.string().trim().max(600).optional(),
  disclaimer: z.string().trim().max(400).optional(),
});

export const quoteQuestionSchema = z.object({
  label: z.string().trim().min(3, "Intitulé de la question requis.").max(140),
  helpText: z.string().trim().max(300).optional(),
  kind: z.enum(["SINGLE_CHOICE", "MULTI_CHOICE"]),
  required: checkbox.default(true),
});

export const quoteOptionSchema = z.object({
  label: z.string().trim().min(1, "Intitulé de la réponse requis.").max(140),
  description: z.string().trim().max(300).optional(),
  /** May be negative: a provider can offer a discount for a simpler option. */
  priceAdjustment: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  durationAdjustment: z.coerce.number().int().min(-600).max(600).default(0),
});

/** A group of prestations on the public catalogue. */
export const serviceCategorySchema = z.object({
  name: z.string().trim().min(2, "Nom de la catégorie requis.").max(80),
  description: z.string().trim().max(400).optional(),
  active: checkbox.default(true),
});

export const providerHighlightSchema = z.object({
  kind: z.enum(["COMMITMENT", "CREDENTIAL"]),
  title: z.string().trim().min(2, "Intitulé requis.").max(120),
  description: z.string().trim().max(400).optional(),
  meta: z.string().trim().max(24).optional(),
});

export const rejectPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Indiquez un motif : la cliente le recevra par email.")
    .max(500),
});

export const providerNoteSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export type FieldErrors = Record<string, string>;

/** Flatten a ZodError into one message per field, ready for a form. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; errors?: FieldErrors };

export const IDLE: ActionState = { status: "idle" };
