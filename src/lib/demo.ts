import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * The public walkthrough account.
 *
 * A demonstration should be the product, not a drawing of it — the way a
 * theme's "live preview" drops you into a real running copy. So the demo here
 * is an ordinary provider with invented data: her site is served by the same
 * route as everyone else's, and her dashboard by the same guards. Nothing
 * about it is special-cased, which is also the point — anything a visitor sees
 * working is genuinely working.
 *
 * It is opt-in through the environment. With DEMO_SLUG and DEMO_EMAIL unset,
 * the door does not exist: a public way into a real account is not something
 * that should appear by default, least of all in someone else's deployment.
 */

export type Demo = {
  slug: string;
  businessName: string;
  userId: string;
};

/**
 * The demo, if this installation has one and it is still in a fit state to be
 * shown. Returns null rather than throwing: a missing demo should make the
 * invitation disappear, not break the page that offers it.
 */
export async function demoTarget(): Promise<Demo | null> {
  const slug = env().DEMO_SLUG;
  const email = env().DEMO_EMAIL;
  if (!slug || !email) return null;

  const user = await prisma.user
    .findUnique({
      where: { email },
      select: {
        id: true,
        active: true,
        role: true,
        provider: { select: { slug: true, businessName: true, status: true } },
      },
    })
    .catch(() => null);

  if (!user?.active || !user.provider) return null;

  // The address and the slug have to agree. Two settings pointing at different
  // providers would sign a visitor into one account and show her another's
  // site, which is the kind of mix-up that is worth one comparison to avoid.
  if (user.provider.slug !== slug || user.provider.status !== "ACTIVE") {
    return null;
  }

  return {
    slug: user.provider.slug,
    businessName: user.provider.businessName,
    userId: user.id,
  };
}
