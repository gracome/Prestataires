import { cache } from "react";
import { notFound } from "next/navigation";
import type {
  BookingSettings,
  FaqItem,
  GalleryImage,
  PaymentInstruction,
  Provider,
  ProviderHighlight,
  Service,
  Category,
  ServiceStep,
  SiteSettings,
  SocialLink,
  Theme,
  WorkingHours,
} from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Everything the public site of one provider needs, in a single query.
 *
 * Wrapped in React's `cache` so a layout and the page it renders share one
 * database round trip per request.
 */

export type PortfolioImage = GalleryImage & { category: Category | null };

export type ShowcaseService = Service & {
  category: Category | null;
  steps: ServiceStep[];
  galleryImages: GalleryImage[];
};

export type PublicSite = Provider & {
  theme: Theme | null;
  siteSettings: SiteSettings | null;
  bookingSettings: BookingSettings | null;
  services: ShowcaseService[];
  workingHours: WorkingHours[];
  galleryImages: PortfolioImage[];
  highlights: ProviderHighlight[];
  faqItems: FaqItem[];
  socialLinks: SocialLink[];
  paymentInstructions: PaymentInstruction[];
};

/** Slugs that would collide with the platform's own routes. */
export const RESERVED_SLUGS = new Set([
  "api",
  "dashboard",
  "login",
  "logout",
  "onboarding",
  "reservation",
  "reservations",
  "admin",
  "static",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export const getPublicSite = cache(
  async (slug: string): Promise<PublicSite | null> => {
    if (RESERVED_SLUGS.has(slug.toLowerCase())) return null;

    const provider = await prisma.provider.findFirst({
      where: { slug: slug.toLowerCase(), status: "ACTIVE" },
      include: {
        theme: true,
        siteSettings: true,
        bookingSettings: true,
        services: {
          where: { active: true },
          orderBy: [{ position: "asc" }, { name: "asc" }],
          include: {
            category: true,
            steps: { orderBy: { position: "asc" } },
            galleryImages: {
              where: { active: true },
              orderBy: [{ featured: "desc" }, { position: "asc" }],
            },
          },
        },
        workingHours: { orderBy: { dayOfWeek: "asc" } },
        galleryImages: {
          where: { active: true },
          include: { category: true },
          orderBy: [{ featured: "desc" }, { position: "asc" }, { createdAt: "desc" }],
        },
        highlights: { orderBy: [{ kind: "asc" }, { position: "asc" }] },
        faqItems: {
          where: { active: true },
          orderBy: { position: "asc" },
        },
        socialLinks: { orderBy: { position: "asc" } },
        paymentInstructions: {
          where: { active: true },
          orderBy: { position: "asc" },
        },
      },
    });

    return provider;
  },
);

export async function getPublicSiteOrNotFound(slug: string): Promise<PublicSite> {
  const site = await getPublicSite(slug);
  if (!site) notFound();
  return site;
}

/** One prestation by its slug, or a 404. */
export async function getServiceOrNotFound(
  site: PublicSite,
  serviceSlug: string,
): Promise<ShowcaseService> {
  const service = site.services.find((s) => s.slug === serviceSlug);
  if (!service) notFound();
  return service;
}

/**
 * Services grouped by category.
 *
 * Categories come out in the order the provider arranged them, and the
 * prestations she left ungrouped come last under no heading.
 */
export function groupServicesByCategory(
  services: ShowcaseService[],
): Array<{ category: Category | null; services: ShowcaseService[] }> {
  const groups = new Map<string, { category: Category | null; services: ShowcaseService[] }>();
  const UNGROUPED = "__ungrouped__";

  for (const service of services) {
    const key = service.category?.id ?? UNGROUPED;
    const bucket = groups.get(key);
    if (bucket) bucket.services.push(service);
    else groups.set(key, { category: service.category, services: [service] });
  }

  return Array.from(groups.values()).sort((a, b) => {
    // Ungrouped prestations always close the list.
    if (!a.category) return 1;
    if (!b.category) return -1;
    return a.category.position - b.category.position;
  });
}

/**
 * Categories present on the portfolio, in the order the provider arranged
 * them rather than the order the photos happen to appear in.
 */
export function galleryCategories(images: PortfolioImage[]): Category[] {
  const byId = new Map<string, Category>();
  for (const image of images) {
    if (image.category) byId.set(image.category.id, image.category);
  }
  return Array.from(byId.values()).sort((a, b) => a.position - b.position);
}

/** WhatsApp deep link with the provider's prefilled message. */
export function whatsappLink(
  provider: Pick<Provider, "whatsappPhone" | "whatsappPrefill" | "businessName">,
  customMessage?: string,
): string | null {
  if (!provider.whatsappPhone) return null;

  const digits = provider.whatsappPhone.replace(/[^0-9]/g, "");
  if (digits.length < 6) return null;

  const message =
    customMessage?.trim() ||
    provider.whatsappPrefill?.trim() ||
    "Bonjour, je souhaite avoir des informations concernant une réservation.";

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function telLink(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

/**
 * Whether the provider is open right now, and until when.
 *
 * Shown in the hero: "Ouvert aujourd'hui jusqu'à 18h00" answers the first
 * question a visitor has, and it is real information rather than decoration.
 */
export type OpenState =
  | { open: true; closesAt: string }
  | { open: false; nextDay: string | null; nextOpensAt: string | null };

export function currentOpenState(
  workingHours: WorkingHours[],
  timezone: string,
  now = new Date(),
): OpenState {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";

  const WEEKDAYS: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const today = WEEKDAYS[weekday] ?? 0;
  const minuteOfDay = hour * 60 + minute;

  const byDay = new Map(workingHours.map((wh) => [wh.dayOfWeek, wh]));
  const rule = byDay.get(today);

  const format = (value: number) =>
    `${String(Math.floor(value / 60) % 24).padStart(2, "0")}h${String(value % 60).padStart(2, "0")}`;

  if (rule?.active && minuteOfDay >= rule.openMinute && minuteOfDay < rule.closeMinute) {
    const onBreak =
      rule.breakStartMinute != null &&
      rule.breakEndMinute != null &&
      minuteOfDay >= rule.breakStartMinute &&
      minuteOfDay < rule.breakEndMinute;

    if (!onBreak) return { open: true, closesAt: format(rule.closeMinute) };
  }

  // Look ahead up to a week for the next opening day.
  const DAY_NAMES = [
    "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
  ];

  for (let offset = 0; offset < 8; offset += 1) {
    const day = (today + offset) % 7;
    const candidate = byDay.get(day);
    if (!candidate?.active) continue;
    if (offset === 0 && minuteOfDay >= candidate.openMinute) continue;

    return {
      open: false,
      nextDay: offset === 0 ? "aujourd'hui" : offset === 1 ? "demain" : DAY_NAMES[day],
      nextOpensAt: format(candidate.openMinute),
    };
  }

  return { open: false, nextDay: null, nextOpensAt: null };
}
