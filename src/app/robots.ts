import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/**
 * Crawl rules (cahier des charges section 25).
 *
 * Provider sites are meant to be found. Everything private is excluded:
 * the dashboard, the API, and above all /reservation/{token}, which is a
 * customer's personal booking page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/login", "/reservation/"],
      },
    ],
    sitemap: appUrl("/sitemap.xml"),
  };
}
