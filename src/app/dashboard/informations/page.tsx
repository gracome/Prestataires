import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import {
  adminColorsFromSite,
  DEFAULT_ADMIN_THEME,
  DEFAULT_THEME,
} from "@/lib/theme";
import { PageHeader, Section } from "@/components/dashboard/ui";
import {
  FaqManager,
  ProfileForm,
  SiteSettingsForm,
  ThemeForm,
} from "@/components/dashboard/IdentityForms";
import { HighlightManager } from "@/components/dashboard/HighlightManager";
import { AdminThemeForm } from "@/components/dashboard/AdminThemeForm";

export const dynamic = "force-dynamic";

/**
 * A short, curated timezone list: the target markets first, then the common
 * European ones. A full IANA list would be 600 entries of noise.
 */
const TIMEZONES = [
  "Africa/Porto-Novo",
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Bamako",
  "Africa/Conakry",
  "Africa/Dakar",
  "Africa/Douala",
  "Africa/Kinshasa",
  "Africa/Lagos",
  "Africa/Libreville",
  "Africa/Lome",
  "Africa/Nouakchott",
  "Africa/Ouagadougou",
  "Africa/Casablanca",
  "Africa/Tunis",
  "Africa/Algiers",
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/London",
  "America/Montreal",
  "UTC",
];

export default async function InformationsPage() {
  const { provider } = await requireSection("site");

  const [theme, site, faqItems, highlights] = await Promise.all([
    prisma.theme.findUnique({ where: { providerId: provider.id } }),
    prisma.siteSettings.findUnique({ where: { providerId: provider.id } }),
    prisma.faqItem.findMany({
      where: { providerId: provider.id },
      orderBy: { position: "asc" },
    }),
    prisma.providerHighlight.findMany({
      where: { providerId: provider.id },
      orderBy: { position: "asc" },
    }),
  ]);

  const timezones = TIMEZONES.includes(provider.timezone)
    ? TIMEZONES
    : [provider.timezone, ...TIMEZONES];

  const commitments = highlights.filter((h) => h.kind === "COMMITMENT");
  const credentials = highlights.filter((h) => h.kind === "CREDENTIAL");

  return (
    <>
      <PageHeader
        title="Informations et apparence"
        description="Tout ce qui apparaît sur votre site public se règle ici, sans toucher au code."
      />

      <Section title="Votre activité">
        <ProfileForm
          timezones={timezones}
          values={{
            businessName: provider.businessName,
            ownerName: provider.ownerName,
            tagline: provider.tagline ?? "",
            description: provider.description ?? "",
            email: provider.email,
            phone: provider.phone ?? "",
            whatsappPhone: provider.whatsappPhone ?? "",
            whatsappPrefill: provider.whatsappPrefill ?? "",
            addressLine: provider.addressLine ?? "",
            city: provider.city ?? "",
            country: provider.country ?? "",
            mapsUrl: provider.mapsUrl ?? "",
            timezone: provider.timezone,
            currency: provider.currency,
            logoUrl: provider.logoUrl ?? "",
            coverImageUrl: provider.coverImageUrl ?? "",
          }}
        />
      </Section>

      <Section title="Vos engagements">
        <HighlightManager kind="COMMITMENT" items={commitments} />
      </Section>

      <Section title="Formations et certifications">
        <HighlightManager kind="CREDENTIAL" items={credentials} />
      </Section>

      <Section
        title="Apparence du site public"
        description="Les couleurs et polices choisies ici s'appliquent à tout votre site, celui que voient vos clientes."
      >
        <ThemeForm theme={theme ?? DEFAULT_THEME} />
      </Section>

      <Section
        title="Apparence de votre tableau de bord"
        description="Votre espace de travail, réglable indépendamment du site. Vous y passez vos journées, choisissez ce qui vous repose les yeux."
      >
        <AdminThemeForm
          theme={theme ?? { ...DEFAULT_THEME, ...DEFAULT_ADMIN_THEME }}
          siteColors={adminColorsFromSite(theme ?? DEFAULT_THEME)}
        />
      </Section>

      <Section
        title="Contenu et sections du site"
        description="Activez seulement les sections utiles à votre activité."
      >
        <SiteSettingsForm
          values={{
            showAbout: site?.showAbout ?? true,
            showServices: site?.showServices ?? true,
            showPricing: site?.showPricing ?? true,
            showGallery: site?.showGallery ?? true,
            showHours: site?.showHours ?? true,
            showLocation: site?.showLocation ?? true,
            showBooking: site?.showBooking ?? true,
            showContact: site?.showContact ?? true,
            showFaq: site?.showFaq ?? true,
            showQuoteRequest: site?.showQuoteRequest ?? false,
            showRealisations: site?.showRealisations ?? true,
            heroHeadline: site?.heroHeadline ?? "",
            heroSubheadline: site?.heroSubheadline ?? "",
            heroEyebrow: site?.heroEyebrow ?? "",
            heroCtaLabel: site?.heroCtaLabel ?? "",
            aboutTitle: site?.aboutTitle ?? "",
            aboutBody: site?.aboutBody ?? "",
            aboutQuote: site?.aboutQuote ?? "",
            aboutPortraitUrl: site?.aboutPortraitUrl ?? "",
            servicesIntro: site?.servicesIntro ?? "",
            realisationsIntro: site?.realisationsIntro ?? "",
            seoTitle: site?.seoTitle ?? "",
            seoDescription: site?.seoDescription ?? "",
            ogImageUrl: site?.ogImageUrl ?? "",
          }}
        />
      </Section>

      <Section
        title="Questions fréquentes"
        description="Répondez une fois ici plutôt que dix fois sur WhatsApp."
      >
        <FaqManager items={faqItems} />
      </Section>
    </>
  );
}
