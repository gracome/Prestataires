import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { appUrl, env } from "@/lib/env";
import { FEATURES, sellableFeatures } from "@/lib/plans/catalogue";
import { OFFERS } from "@/lib/marketing/company";

export const revalidate = 3600;

/**
 * What search engines should know about (cahier des charges section 25).
 *
 * It listed the home page and the provider sites, which was right when the
 * home page was the whole company site. It is not any more: the product page,
 * the two service pages and one page per module were invisible — the pages
 * that answer the searches we actually want to win.
 *
 * Priorities say what we would rather rank: a provider's own site above our
 * marketing, because hers is the one with a customer at the other end.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const providers = await prisma.provider
    .findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    })
    .catch(() => []);

  const now = new Date();

  // The demonstration tenant is a real provider row, so it arrives with the
  // others — and would then compete with them for the same searches on content
  // we invented. It is excluded here and noindexed on its own pages.
  const demoSlug = env().DEMO_SLUG;

  const company: MetadataRoute.Sitemap = [
    { url: appUrl("/"), changeFrequency: "monthly" as const, priority: 1 },
    ...OFFERS.map((offer) => ({
      url: appUrl(offer.href),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...sellableFeatures().map((feature) => ({
      url: appUrl(`/modules/${FEATURES[feature].slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ].map((entry) => ({ ...entry, lastModified: now }));

  return [
    ...company,
    ...providers
      .filter((provider) => provider.slug !== demoSlug)
      .map((provider) => ({
        url: appUrl(`/${provider.slug}`),
        lastModified: provider.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
  ];
}
