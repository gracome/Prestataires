import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { constantTimeEquals } from "@/lib/crypto";
import { runScheduledJobs } from "@/lib/jobs/runner";

/**
 * POST (or GET) /api/jobs/run
 *
 * Scheduled maintenance: expire lapsed holds, release their slots, send the
 * expiry emails, close past appointments, send reminders and refresh Google
 * busy periods.
 *
 * Call it every 5 minutes from a platform scheduler (Vercel Cron, a systemd
 * timer, GitHub Actions, cron) with the shared secret:
 *
 *   curl -X POST https://example.com/api/jobs/run \
 *        -H "authorization: Bearer $CRON_SECRET"
 *
 * GET is accepted because several hosted schedulers only issue GET requests.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request): Promise<NextResponse> {
  const secret = env().CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET is not configured; the scheduled-job endpoint is disabled.",
      },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Vercel Cron sends its own header; both forms are accepted.
  const alternative = request.headers.get("x-cron-secret") ?? "";

  if (
    !constantTimeEquals(bearer, secret) &&
    !constantTimeEquals(alternative, secret)
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(request.url);
  const report = await runScheduledJobs({
    syncCalendars: url.searchParams.get("calendars") !== "0",
    sendReminders: url.searchParams.get("reminders") !== "0",
  });

  return NextResponse.json(report, {
    status: report.errors.length > 0 ? 207 : 200,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
