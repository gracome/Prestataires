import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { appUrl, env } from "@/lib/env";
import { FEATURES, sellableFeatures } from "@/lib/plans/catalogue";

export const revalidate = 3600;

/**
 * What search engines should know about (cahier des charges section 25).
 *
 * It listed the home page and the provider sites only, so the page per module
 * was invisible — and those are the pages that answer the searches we want to
 * win.
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

  const marketing: MetadataRoute.Sitemap = [
    { url: appUrl("/"), changeFrequency: "monthly" as const, priority: 1 },
    // The page an account is opened on. Second only to the landing page: it
    // is the one somebody searching for us by name wants to land on.
    { url: appUrl("/inscription"), changeFrequency: "monthly" as const, priority: 0.9 },
    ...sellableFeatures().map((feature) => ({
      url: appUrl(`/modules/${FEATURES[feature].slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ].map((entry) => ({ ...entry, lastModified: now }));

  return [
    ...marketing,
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
