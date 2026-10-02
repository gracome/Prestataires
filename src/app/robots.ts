import type { MetadataRoute } from "next";
import { appUrl, env } from "@/lib/env";

/**
 * Crawl rules (cahier des charges section 25).
 *
 * Provider sites are meant to be found. Everything private is excluded: the
 * dashboard, the administration screens, the API, and above all
 * /reservation/{token}, which is a customer's personal booking page and would
 * be readable by anyone who found the link in an index.
 *
 * The demonstration is excluded too. Its pages carry noindex of their own, but
 * the provider site behind it is an ordinary route that nothing else would
 * stop — and a salon we invented has no business competing with real ones.
 */
export default function robots(): MetadataRoute.Robots {
  const demoSlug = env().DEMO_SLUG;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/login",
          "/onboarding",
          "/reservation/",
          "/demo",
          ...(demoSlug ? [`/${demoSlug}`] : []),
        ],
      },
    ],
    sitemap: appUrl("/sitemap.xml"),
  };
}
