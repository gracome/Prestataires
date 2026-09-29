"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth/session";
import { demoTarget } from "@/lib/demo";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * Open the demo dashboard.
 *
 * A password printed on a page is a password nobody types: the visitor copies
 * it wrong, blames the product and leaves. So the button signs her in itself.
 *
 * This is a public door into one real account, so it is narrow by
 * construction: it takes no input at all, and the account it opens is fixed by
 * the environment and re-checked here — there is no parameter a caller could
 * bend towards a different user. What is behind the door is invented data.
 *
 * It is still rate limited. Not against intruders — the door is unlocked — but
 * because each press writes a session row, and an unmetered endpoint that
 * writes rows is a way to fill a table.
 */
export async function enterDemoDashboard(): Promise<void> {
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  const limit = rateLimit(
    `demo:${ip}`,
    LIMITS.login.limit,
    LIMITS.login.windowSeconds,
  );
  if (!limit.allowed) {
    redirect("/demo?trop=1");
  }

  const demo = await demoTarget();
  if (!demo) redirect("/demo");

  await createSession(demo.userId, {
    userAgent: requestHeaders.get("user-agent"),
    ipAddress: ip,
  });

  redirect("/dashboard");
}
