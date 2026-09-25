import { NextResponse, type NextRequest } from "next/server";

/**
 * Custom domain support (cahier des charges section 25).
 *
 * A provider can point www.her-own-domain.com at this application. When a
 * request arrives on a host that is not the platform's own, the host is
 * resolved to a provider slug and the URL is rewritten internally, so
 * https://www.her-own-domain.com/ serves the same page as /{slug} without the
 * visitor ever seeing the slug.
 *
 * Middleware cannot reach the database directly, so the lookup goes through a
 * small internal route and the answer is memoised per instance. A miss costs
 * one extra request; a hit costs nothing.
 */

const RESERVED_PREFIXES = [
  "/api",
  "/dashboard",
  "/login",
  "/logout",
  "/onboarding",
  "/reservation",
  "/_next",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
];

type CacheEntry = { slug: string | null; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60_000;
const NEGATIVE_TTL_MS = 60_000;

export const config = {
  // Static assets and image optimisation never need a rewrite.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
  const host = normaliseHost(request.headers.get("host"));
  if (!host) return NextResponse.next();

  const platformHost = normaliseHost(
    safeHost(process.env.APP_URL ?? "http://localhost:3000"),
  );

  // Requests on the platform's own host, or on localhost, route normally.
  if (!platformHost || host === platformHost || isLocal(host)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (RESERVED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const slug = await resolveSlug(host, request.nextUrl.origin);
  if (!slug) return NextResponse.next();

  // Already pointing at the right provider: leave it alone so the rewrite
  // cannot stack into /slug/slug on an internal navigation.
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${slug}` : `/${slug}${pathname}`;
  return NextResponse.rewrite(url);
}

async function resolveSlug(host: string, origin: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(host);
  if (cached && cached.expiresAt > now) return cached.slug;

  try {
    const response = await fetch(
      `${origin}/api/internal/resolve-domain?host=${encodeURIComponent(host)}`,
      { headers: { "x-middleware-lookup": "1" } },
    );

    if (!response.ok) {
      cache.set(host, { slug: null, expiresAt: now + NEGATIVE_TTL_MS });
      return null;
    }

    const payload = (await response.json()) as { slug?: string | null };
    const slug = payload.slug ?? null;

    cache.set(host, {
      slug,
      expiresAt: now + (slug ? TTL_MS : NEGATIVE_TTL_MS),
    });
    return slug;
  } catch {
    // A failed lookup must never take the site down: fall through to normal
    // routing and try again after the negative cache expires.
    cache.set(host, { slug: null, expiresAt: now + NEGATIVE_TTL_MS });
    return null;
  }
}

function normaliseHost(host: string | null): string | null {
  if (!host) return null;
  return host.toLowerCase().split(":")[0].replace(/^www\./, "");
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function isLocal(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}
