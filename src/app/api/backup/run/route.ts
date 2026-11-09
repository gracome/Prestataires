import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { constantTimeEquals } from "@/lib/crypto";
import { runBackup } from "@/lib/backup/run";

/**
 * POST (or GET) /api/backup/run
 *
 * Takes one encrypted copy of the database and mails it off the platform.
 * Call it from a scheduler on whatever cadence the risk deserves (every three
 * days at the time of writing) with the shared secret:
 *
 *   curl -X POST https://example.com/api/backup/run \
 *        -H "authorization: Bearer $CRON_SECRET"
 *
 * It exists because the nightly pg_dump lives in a GitHub workflow that has
 * never been allowed to start — twenty runs, twenty failures, not one step
 * executed — and a backup that depends on somebody else's billing is not a
 * backup. This one runs where the application runs.
 *
 * It shares CRON_SECRET with the other scheduled endpoints: a second secret
 * to store, rotate and leak buys nothing, since both answer the same trust.
 * GET is accepted because several hosted schedulers only issue GET requests.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  try {
    return NextResponse.json(await runBackup(), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    // The scheduler needs a failing status to alert on. The reason is useful
    // here and safe: this endpoint answers to a secret, and a copy that was
    // refused for being too small or too large has to say which.
    const reason = error instanceof Error ? error.message : String(error);
    console.error("database backup failed", error);
    return NextResponse.json({ error: reason }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
