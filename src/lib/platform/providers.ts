import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { Provider, ProviderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toMinorUnits } from "@/lib/money";
import { getActivity, type ActivityId, type Palette } from "./activities";

/**
 * Creating and administering provider accounts.
 *
 * The command line script and the platform screens both come through here, so
 * an account created from a terminal and one created from the browser are the
 * same account, with the same defaults.
 */

export type CreateProviderInput = {
  businessName: string;
  ownerName: string;
  email: string;
  slug?: string;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string;
  currency?: string;
  /** Left out, one is generated and returned once. */
  password?: string;

  /** Trade, which decides the palette, the wording and the starter catalogue. */
  activity?: ActivityId;
  /** Overrides on top of the trade's palette, when she already has colours. */
  palette?: Partial<Palette>;
  tagline?: string | null;
  description?: string | null;
  addressLine?: string | null;
  whatsappPhone?: string | null;
  /** Off when the provider already has her own list to import. */
  seedCatalogue?: boolean;
};

export type CreatedProvider = {
  provider: Provider;
  email: string;
  /** Shown once and never stored in the clear. */
  password: string;
};

export class PlatformError extends Error {
  constructor(
    message: string,
    /** Which field the message belongs to, when it belongs to one. */
    readonly field?: string,
  ) {
    super(message);
    this.name = "PlatformError";
  }
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * A password that can be read aloud over the phone.
 *
 * The alphabet leaves out the characters that get confused when someone reads
 * them out or copies them off a screen: no O against 0, no I against 1.
 */
export function generatePassword(): string {
  const alphabet = "ACDEFGHJKMNPQRTUVWXY234679";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export async function createProvider(
  input: CreateProviderInput,
): Promise<CreatedProvider> {
  const businessName = input.businessName.trim();
  const ownerName = input.ownerName.trim();
  const email = input.email.trim().toLowerCase();

  if (!businessName) throw new PlatformError("Le nom de l'activité est requis.", "businessName");
  if (!ownerName) throw new PlatformError("Le nom de la responsable est requis.", "ownerName");
  if (!email.includes("@")) throw new PlatformError("Adresse e-mail invalide.", "email");

  const slug = slugify(input.slug?.trim() || businessName);
  if (!slug) {
    throw new PlatformError(
      "Impossible de déduire une adresse de site depuis ce nom. Saisissez-la.",
      "slug",
    );
  }

  const [slugTaken, emailTaken] = await Promise.all([
    prisma.provider.findUnique({ where: { slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ]);

  if (slugTaken) {
    throw new PlatformError(`L'adresse « ${slug} » est déjà prise.`, "slug");
  }
  if (emailTaken) {
    throw new PlatformError("Un compte utilise déjà cette adresse e-mail.", "email");
  }

  const password = input.password?.trim() || generatePassword();
  const activity = getActivity(input.activity);
  const palette = { ...activity.palette, ...input.palette };
  const currency = (input.currency?.trim() || "XOF").toUpperCase();

  const provider = await prisma.provider.create({
    data: {
      slug,
      // Starts as a draft: the provider publishes it once the content is ready.
      status: "DRAFT",
      businessName,
      ownerName,
      email,
      tagline: input.tagline?.trim() || activity.taglineTemplate,
      description: input.description?.trim() || null,
      phone: input.phone?.trim() || null,
      whatsappPhone: input.whatsappPhone?.trim() || input.phone?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      timezone: input.timezone?.trim() || "Africa/Porto-Novo",
      currency,
      theme: { create: palette },
      siteSettings: {
        create: {
          heroEyebrow: [activity.eyebrow, input.city?.trim()]
            .filter(Boolean)
            .join(" · "),
          heroHeadline: businessName,
          heroSubheadline: input.tagline?.trim() || activity.taglineTemplate,
          heroCtaLabel: activity.heroCtaLabel,
        },
      },
      bookingSettings: { create: {} },
      workingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          // Closed Sunday by default; every other day 09:00 to 18:00.
          active: dayOfWeek !== 0,
          openMinute: 9 * 60,
          closeMinute: 18 * 60,
        })),
      },
      users: {
        create: {
          email,
          name: ownerName,
          role: "PROVIDER",
          passwordHash: await bcrypt.hash(password, 12),
        },
      },
    },
  });

  if (input.seedCatalogue !== false) {
    await seedCatalogue(provider.id, input.activity, currency);
  }

  return { provider, email, password };
}

/**
 * The starter catalogue.
 *
 * Categories and a handful of prestations from the chosen trade, so the
 * booking journey can be walked end to end on the first day. She renames,
 * reprices or deletes them; none of it is special in any way.
 */
async function seedCatalogue(
  providerId: string,
  activityId: ActivityId | undefined,
  currency: string,
): Promise<void> {
  const activity = getActivity(activityId);
  if (activity.services.length === 0) return;

  const categories = new Map<string, string>();

  for (const [index, name] of activity.categories.entries()) {
    const category = await prisma.category.create({
      data: { providerId, name, position: index },
      select: { id: true },
    });
    categories.set(name, category.id);
  }

  const takenSlugs = new Set<string>();

  for (const [index, service] of activity.services.entries()) {
    // Two prestations can share a name across trades but not inside one
    // provider, so the slug is made unique here rather than hoping.
    let slug = slugify(service.name) || `prestation-${index + 1}`;
    let attempt = 2;
    while (takenSlugs.has(slug)) slug = `${slugify(service.name)}-${attempt++}`;
    takenSlugs.add(slug);

    await prisma.service.create({
      data: {
        providerId,
        name: service.name,
        slug,
        shortDescription: service.shortDescription,
        categoryId: categories.get(service.category) ?? null,
        price: toMinorUnits(service.price, currency),
        durationMinutes: service.durationMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
        popular: service.popular ?? false,
        position: index,
      },
    });
  }
}

/**
 * Change a provider's status.
 *
 * Suspending also revokes every live session of her accounts: leaving someone
 * signed in after suspending them would make the button decorative.
 */
export async function setProviderStatus(
  providerId: string,
  status: ProviderStatus,
): Promise<void> {
  await prisma.provider.update({ where: { id: providerId }, data: { status } });

  if (status === "SUSPENDED") {
    const users = await prisma.user.findMany({
      where: { providerId },
      select: { id: true },
    });
    await prisma.session.updateMany({
      where: { userId: { in: users.map((user) => user.id) }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

/**
 * Give a provider a new password, returned once.
 *
 * Every existing session is revoked, because a password reset that leaves the
 * old sessions alive protects nobody.
 */
export async function resetProviderPassword(
  providerId: string,
): Promise<{ email: string; password: string }> {
  const user = await prisma.user.findFirst({
    where: { providerId, role: "PROVIDER" },
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    throw new PlatformError("Cette activité n'a aucun compte de connexion.");
  }

  const password = generatePassword();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { email: user.email, password };
}
