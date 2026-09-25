import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";

export const revalidate = 3600;

/** One entry per active provider site (cahier des charges section 25). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const providers = await prisma.provider
    .findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    })
    .catch(() => []);

  return [
    {
      url: appUrl("/"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...providers.map((provider) => ({
      url: appUrl(`/${provider.slug}`),
      lastModified: provider.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
