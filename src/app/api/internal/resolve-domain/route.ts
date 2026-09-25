import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/internal/resolve-domain?host=example.com
 *
 * Maps a custom domain to a provider slug for the middleware rewrite. The
 * answer contains nothing private: it is the same slug that appears in the
 * public URL. The route exists only because middleware cannot query the
 * database itself.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = new URL(request.url).searchParams.get("host")?.toLowerCase();

  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)) {
    return NextResponse.json({ slug: null }, { status: 400 });
  }

  const bare = host.replace(/^www\./, "");

  const provider = await prisma.provider.findFirst({
    where: {
      status: "ACTIVE",
      // Match the domain as stored, with or without the www prefix.
      OR: [{ customDomain: bare }, { customDomain: `www.${bare}` }],
    },
    select: { slug: true },
  });

  return NextResponse.json(
    { slug: provider?.slug ?? null },
    {
      headers: {
        "cache-control": provider
          ? "public, max-age=300"
          : "public, max-age=60",
      },
    },
  );
}
