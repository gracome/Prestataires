import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { constantTimeEquals } from "@/lib/crypto";
import { resetDemo } from "@/lib/demo/reset";

/**
 * POST (or GET) /api/demo/reset
 *
 * Rebuilds the public demonstration. Call it once a day from a scheduler with
 * the shared secret:
 *
 *   curl -X POST https://example.com/api/demo/reset \
 *        -H "authorization: Bearer $CRON_SECRET"
 *
 * It is deliberately not part of the five-minute maintenance run: that one is
 * meant to be cheap and frequent, and this one deletes and rewrites a few
 * hundred rows. GET is accepted because several hosted schedulers only issue
 * GET requests.
 *
 * It shares CRON_SECRET with the maintenance endpoint rather than having one
 * of its own. A second secret to store, rotate and leak buys nothing here:
 * both are the same trust — whoever runs our schedule.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request): Promise<NextResponse> {
  const secret = env().CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; this endpoint is disabled." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alternative = request.headers.get("x-cron-secret") ?? "";

  if (
    !constantTimeEquals(bearer, secret) &&
    !constantTimeEquals(alternative, secret)
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const started = Date.now();

  try {
    const report = await resetDemo();
    return NextResponse.json({ ...report, ms: Date.now() - started });
  } catch (error) {
    // The scheduler needs a failing status to alert on; the message stays out
    // of the response because this endpoint answers to a secret, not a person.
    console.error("demo reset failed", error);
    return NextResponse.json(
      { error: "La remise à zéro a échoué." },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET = handle;
