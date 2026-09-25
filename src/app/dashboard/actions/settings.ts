"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProviderApi } from "@/lib/auth/guard";
import { hashPassword, verifyPassword, checkPasswordStrength } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { MAX_ACCOUNTS_PER_PROVIDER } from "@/lib/auth/permissions";
import { generatePassword } from "@/lib/platform/providers";
import {
  adminThemeSchema,
  bookingSettingsSchema,
  changePasswordSchema,
  fieldErrors,
  providerProfileSchema,
  siteSettingsSchema,
  themeSchema,
  type ActionState,
} from "@/lib/validation";
import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  mediaPrefix,
  putFile,
  StorageError,
} from "@/lib/storage";
import {
  ADMIN_PRESETS,
  adminColorsFromSite,
  DEFAULT_THEME,
} from "@/lib/theme";
import { disconnect } from "@/lib/google/oauth";
import { syncBusyPeriods } from "@/lib/google/calendar";

/**
 * Provider configuration (cahier des charges sections 19, 20 and 23).
 */

function refreshSite(slug: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/informations");
  revalidatePath("/dashboard/parametres");
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/reservation`);
  revalidatePath(`/${slug}/prestations`);
  revalidatePath(`/${slug}/realisations`);
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string): string | null {
  return value.length > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// Identity and contact
// ---------------------------------------------------------------------------

export async function saveProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const parsed = providerProfileSchema.safeParse({
    businessName: read(formData, "businessName"),
    ownerName: read(formData, "ownerName"),
    tagline: read(formData, "tagline"),
    description: read(formData, "description"),
    email: read(formData, "email"),
    phone: read(formData, "phone"),
    whatsappPhone: read(formData, "whatsappPhone"),
    whatsappPrefill: read(formData, "whatsappPrefill"),
    addressLine: read(formData, "addressLine"),
    city: read(formData, "city"),
    country: read(formData, "country"),
    mapsUrl: read(formData, "mapsUrl"),
    timezone: read(formData, "timezone") || provider.timezone,
    currency: read(formData, "currency") || provider.currency,
    logoUrl: read(formData, "logoUrl"),
    coverImageUrl: read(formData, "coverImageUrl"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  if (!isValidTimezone(data.timezone)) {
    return {
      status: "error",
      message: "Fuseau horaire inconnu.",
      errors: { timezone: "Fuseau horaire inconnu." },
    };
  }

  // Uploaded files win over the URL fields they replace.
  const logoUpload = await storeImage(formData.get("logoFile"), provider.id, "logo");
  if (logoUpload.error) return logoUpload.error;

  const coverUpload = await storeImage(formData.get("coverFile"), provider.id, "cover");
  if (coverUpload.error) return coverUpload.error;

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      businessName: data.businessName,
      ownerName: data.ownerName,
      tagline: nullable(data.tagline ?? ""),
      description: nullable(data.description ?? ""),
      email: data.email,
      phone: nullable(data.phone ?? ""),
      whatsappPhone: nullable(data.whatsappPhone ?? ""),
      whatsappPrefill: nullable(data.whatsappPrefill ?? ""),
      addressLine: nullable(data.addressLine ?? ""),
      city: nullable(data.city ?? ""),
      country: nullable(data.country ?? ""),
      mapsUrl: nullable(data.mapsUrl ?? ""),
      timezone: data.timezone,
      currency: data.currency.toUpperCase(),
      logoUrl: logoUpload.url ?? nullable(data.logoUrl ?? ""),
      coverImageUrl: coverUpload.url ?? nullable(data.coverImageUrl ?? ""),
    },
  });

  refreshSite(provider.slug);
  return { status: "success", message: "Informations enregistrées." };
}

async function storeImage(
  entry: FormDataEntryValue | null,
  providerId: string,
  kind: string,
): Promise<{ url?: string; error?: ActionState }> {
  if (!(entry instanceof File) || entry.size === 0) return {};

  try {
    const bytes = new Uint8Array(await entry.arrayBuffer());
    const stored = await putFile(bytes, {
      prefix: `${mediaPrefix(providerId)}/${kind}`,
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maxBytes: MAX_IMAGE_BYTES,
      declaredMimeType: entry.type,
    });
    return { url: `/api/media/${stored.key}` };
  } catch (error) {
    if (error instanceof StorageError) {
      return { error: { status: "error", message: error.message } };
    }
    throw error;
  }
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

export async function saveThemeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const parsed = themeSchema.safeParse({
    primaryColor: read(formData, "primaryColor"),
    secondaryColor: read(formData, "secondaryColor"),
    accentColor: read(formData, "accentColor"),
    backgroundColor: read(formData, "backgroundColor"),
    surfaceColor: read(formData, "surfaceColor"),
    textColor: read(formData, "textColor"),
    mutedTextColor: read(formData, "mutedTextColor"),
    headingFont: read(formData, "headingFont"),
    bodyFont: read(formData, "bodyFont"),
    buttonRadius: read(formData, "buttonRadius"),
    layoutVariant: read(formData, "layoutVariant"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les couleurs signalées.",
      errors: fieldErrors(parsed.error),
    };
  }

  await prisma.theme.upsert({
    where: { providerId: provider.id },
    create: { providerId: provider.id, ...parsed.data },
    update: parsed.data,
  });

  refreshSite(provider.slug);
  return { status: "success", message: "Apparence mise à jour." };
}

/**
 * The dashboard palette (cahier des charges section 20, extended to the
 * provider's own workspace).
 *
 * A preset fills the colours server-side, so choosing "Sombre" or "Comme mon
 * site" never depends on what the browser posted.
 */
export async function saveAdminThemeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const preset = read(formData, "adminPreset") || "neutral";

  // Presets are resolved here, not in the browser.
  let colors: Record<string, string> | null = null;

  if (preset === "site") {
    const theme = await prisma.theme.findUnique({
      where: { providerId: provider.id },
    });
    colors = adminColorsFromSite(theme ?? DEFAULT_THEME);
  } else if (preset !== "custom") {
    colors = ADMIN_PRESETS[preset]?.colors ?? null;
  }

  const parsed = adminThemeSchema.safeParse({
    adminPreset: preset,
    adminBackground: colors?.adminBackground ?? read(formData, "adminBackground"),
    adminSurface: colors?.adminSurface ?? read(formData, "adminSurface"),
    adminText: colors?.adminText ?? read(formData, "adminText"),
    adminMuted: colors?.adminMuted ?? read(formData, "adminMuted"),
    adminBorder: colors?.adminBorder ?? read(formData, "adminBorder"),
    adminAccent: colors?.adminAccent ?? read(formData, "adminAccent"),
    adminFont: read(formData, "adminFont") || "Inter",
    adminRadius: read(formData, "adminRadius") || "medium",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les couleurs signalées.",
      errors: fieldErrors(parsed.error),
    };
  }

  await prisma.theme.upsert({
    where: { providerId: provider.id },
    create: { providerId: provider.id, ...parsed.data },
    update: parsed.data,
  });

  // Every dashboard screen reads this palette from the layout.
  revalidatePath("/dashboard", "layout");

  return { status: "success", message: "Apparence du tableau de bord enregistrée." };
}

export async function saveSiteSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const parsed = siteSettingsSchema.safeParse({
    showAbout: formData.get("showAbout"),
    showServices: formData.get("showServices"),
    showPricing: formData.get("showPricing"),
    showGallery: formData.get("showGallery"),
    showHours: formData.get("showHours"),
    showLocation: formData.get("showLocation"),
    showBooking: formData.get("showBooking"),
    showContact: formData.get("showContact"),
    showFaq: formData.get("showFaq"),
    showQuoteRequest: formData.get("showQuoteRequest"),
    showRealisations: formData.get("showRealisations"),
    heroHeadline: read(formData, "heroHeadline"),
    heroSubheadline: read(formData, "heroSubheadline"),
    heroEyebrow: read(formData, "heroEyebrow"),
    heroCtaLabel: read(formData, "heroCtaLabel"),
    aboutTitle: read(formData, "aboutTitle"),
    aboutBody: read(formData, "aboutBody"),
    aboutQuote: read(formData, "aboutQuote"),
    aboutPortraitUrl: read(formData, "aboutPortraitUrl"),
    servicesIntro: read(formData, "servicesIntro"),
    realisationsIntro: read(formData, "realisationsIntro"),
    seoTitle: read(formData, "seoTitle"),
    seoDescription: read(formData, "seoDescription"),
    ogImageUrl: read(formData, "ogImageUrl"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  // An uploaded portrait replaces whatever URL was stored before.
  const portraitUpload = await storeImage(
    formData.get("aboutPortraitFile"),
    provider.id,
    "portrait",
  );
  if (portraitUpload.error) return portraitUpload.error;

  const data = {
    ...parsed.data,
    heroHeadline: nullable(parsed.data.heroHeadline ?? ""),
    heroSubheadline: nullable(parsed.data.heroSubheadline ?? ""),
    heroEyebrow: nullable(parsed.data.heroEyebrow ?? ""),
    heroCtaLabel: nullable(parsed.data.heroCtaLabel ?? ""),
    aboutTitle: nullable(parsed.data.aboutTitle ?? ""),
    aboutBody: nullable(parsed.data.aboutBody ?? ""),
    aboutQuote: nullable(parsed.data.aboutQuote ?? ""),
    aboutPortraitUrl:
      portraitUpload.url ?? nullable(parsed.data.aboutPortraitUrl ?? ""),
    servicesIntro: nullable(parsed.data.servicesIntro ?? ""),
    realisationsIntro: nullable(parsed.data.realisationsIntro ?? ""),
    seoTitle: nullable(parsed.data.seoTitle ?? ""),
    seoDescription: nullable(parsed.data.seoDescription ?? ""),
    ogImageUrl: nullable(parsed.data.ogImageUrl ?? ""),
  };

  await prisma.siteSettings.upsert({
    where: { providerId: provider.id },
    create: { providerId: provider.id, ...data },
    update: data,
  });

  refreshSite(provider.slug);
  return { status: "success", message: "Contenu du site enregistré." };
}

// ---------------------------------------------------------------------------
// Booking rules
// ---------------------------------------------------------------------------

export async function saveBookingSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  const parsed = bookingSettingsSchema.safeParse({
    bookingEnabled: formData.get("bookingEnabled"),
    slotGranularityMinutes: read(formData, "slotGranularityMinutes"),
    bufferAfterMinutes: read(formData, "bufferAfterMinutes"),
    minLeadTimeMinutes: read(formData, "minLeadTimeMinutes"),
    maxAdvanceDays: read(formData, "maxAdvanceDays"),
    holdDurationMinutes: read(formData, "holdDurationMinutes"),
    proofDeadlineMinutes: read(formData, "proofDeadlineMinutes"),
    verificationDeadlineMinutes: read(formData, "verificationDeadlineMinutes"),
    syncToGoogleCalendar: formData.get("syncToGoogleCalendar"),
    blockOnGoogleBusy: formData.get("blockOnGoogleBusy"),
    requireCustomerEmail: formData.get("requireCustomerEmail"),
    allowCustomerCancellation: formData.get("allowCustomerCancellation"),
    cancellationNoticeHours: read(formData, "cancellationNoticeHours"),
    cancellationPolicy: read(formData, "cancellationPolicy"),
    bookingTerms: read(formData, "bookingTerms"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les réglages signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = {
    ...parsed.data,
    cancellationPolicy: nullable(parsed.data.cancellationPolicy ?? ""),
    bookingTerms: nullable(parsed.data.bookingTerms ?? ""),
  };

  await prisma.bookingSettings.upsert({
    where: { providerId: provider.id },
    create: { providerId: provider.id, ...data },
    update: data,
  });

  refreshSite(provider.slug);
  return { status: "success", message: "Règles de réservation enregistrées." };
}

export async function setProviderStatusAction(
  status: "ACTIVE" | "DRAFT",
): Promise<ActionState> {
  const { provider } = await requireProviderApi();

  await prisma.provider.update({ where: { id: provider.id }, data: { status } });

  refreshSite(provider.slug);
  return {
    status: "success",
    message:
      status === "ACTIVE"
        ? "Votre site est maintenant en ligne."
        : "Votre site est repassé en brouillon et n'est plus visible.",
  };
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export async function changePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireProviderApi();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de corriger les champs signalés.",
      errors: fieldErrors(parsed.error),
    };
  }

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!(await verifyPassword(parsed.data.currentPassword, current.passwordHash))) {
    return {
      status: "error",
      message: "Mot de passe actuel incorrect.",
      errors: { currentPassword: "Mot de passe actuel incorrect." },
    };
  }

  const strength = checkPasswordStrength(parsed.data.newPassword);
  if (!strength.ok) {
    return {
      status: "error",
      message: strength.problems.join(" "),
      errors: { newPassword: strength.problems[0] },
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  // Every other session is dropped, so a stolen cookie stops working the
  // moment the password is changed.
  await revokeAllSessions(user.id);

  return {
    status: "success",
    message:
      "Mot de passe modifié. Vous devrez vous reconnecter sur vos autres appareils.",
  };
}

// ---------------------------------------------------------------------------
// Google Calendar
// ---------------------------------------------------------------------------

export async function disconnectGoogleAction(): Promise<ActionState> {
  const { provider } = await requireProviderApi();
  await disconnect(provider.id);
  revalidatePath("/dashboard/parametres");
  return { status: "success", message: "Google Calendar déconnecté." };
}

export async function syncGoogleAction(): Promise<ActionState> {
  const { provider } = await requireProviderApi();
  const result = await syncBusyPeriods(provider.id);

  revalidatePath("/dashboard/parametres");
  revalidatePath("/dashboard/horaires");
  revalidatePath("/dashboard/calendrier");

  return result.ok
    ? {
        status: "success",
        message: `Synchronisation terminée : ${result.imported} événement${result.imported > 1 ? "s" : ""} pris en compte.`,
      }
    : { status: "error", message: result.reason ?? "La synchronisation a échoué." };
}

// ---------------------------------------------------------------------------
// Team accounts
// ---------------------------------------------------------------------------

/**
 * Giving someone an account.
 *
 * An employee account opens the diary and the service list, and nothing else:
 * no turnover, no bank details, no account settings. The rule lives in
 * `permissions.ts` and is enforced by the guard, not by hiding menu entries.
 *
 * Only the owner may do any of this, hence the "settings" section on every
 * guard call below.
 */

const teamSchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export async function addTeamMemberAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi("settings");

  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0].message,
      errors: fieldErrors(parsed.error),
    };
  }

  const count = await prisma.user.count({ where: { providerId: provider.id } });
  if (count >= MAX_ACCOUNTS_PER_PROVIDER) {
    return {
      status: "error",
      message: `Vous avez atteint ${MAX_ACCOUNTS_PER_PROVIDER} comptes. Retirez-en un avant d'en ajouter un autre.`,
    };
  }

  const taken = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (taken) {
    return {
      status: "error",
      message: "Cette adresse e-mail est déjà utilisée par un autre compte.",
    };
  }

  const password = generatePassword();

  await prisma.user.create({
    data: {
      providerId: provider.id,
      email: parsed.data.email,
      name: parsed.data.name,
      role: "STAFF",
      passwordHash: await hashPassword(password),
    },
  });

  revalidatePath("/dashboard/parametres");

  return {
    status: "success",
    message: `Compte créé pour ${parsed.data.name}. Mot de passe : ${password} — transmettez-le en privé, il ne sera plus affiché.`,
  };
}

/**
 * Remove an account.
 *
 * The owner's own account can never be removed here: it is the only one that
 * can manage the rest, and a workspace without it could not be administered
 * at all.
 */
export async function removeTeamMemberAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider, user } = await requireProviderApi("settings");

  const target = await prisma.user.findUnique({
    where: { id: String(formData.get("userId") ?? "") },
    select: { id: true, name: true, providerId: true, role: true },
  });

  if (!target || target.providerId !== provider.id) {
    return { status: "error", message: "Compte introuvable." };
  }
  if (target.role !== "STAFF" || target.id === user.id) {
    return {
      status: "error",
      message: "Votre propre compte de responsable ne peut pas être retiré.",
    };
  }

  // Deleting cascades to the sessions, so the access stops at once.
  await prisma.user.delete({ where: { id: target.id } });

  revalidatePath("/dashboard/parametres");

  return { status: "success", message: `${target.name} n'a plus accès.` };
}

/** Give an employee a new password without removing her account. */
export async function resetTeamPasswordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { provider } = await requireProviderApi("settings");

  const target = await prisma.user.findUnique({
    where: { id: String(formData.get("userId") ?? "") },
    select: { id: true, name: true, providerId: true, role: true },
  });

  if (!target || target.providerId !== provider.id || target.role !== "STAFF") {
    return { status: "error", message: "Compte introuvable." };
  }

  const password = generatePassword();

  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(password),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  await prisma.session.updateMany({
    where: { userId: target.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/dashboard/parametres");

  return {
    status: "success",
    message: `Nouveau mot de passe pour ${target.name} : ${password} — ses sessions ouvertes sont fermées.`,
  };
}
