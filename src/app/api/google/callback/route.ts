import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireProviderApi, AuthorizationError } from "@/lib/auth/guard";
import {
  exchangeCode,
  OAUTH_STATE_COOKIE,
  saveConnection,
} from "@/lib/google/oauth";
import { syncBusyPeriods } from "@/lib/google/calendar";
import { constantTimeEquals, sha256 } from "@/lib/crypto";
import { appUrl } from "@/lib/env";
import { prisma } from "@/lib/db";

/**
 * GET /api/google/callback
 *
 * Completes the OAuth 2.0 exchange and stores the encrypted tokens.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  const store = await cookies();
  const expected = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);

  if (denied) {
    return back("acces-refuse");
  }

  if (!code || !state || !expected) {
    return back("etat-invalide");
  }

  if (!constantTimeEquals(sha256(state), expected)) {
    return back("etat-invalide");
  }

  let providerId: string;
  try {
    const { provider } = await requireProviderApi();
    providerId = provider.id;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.redirect(appUrl("/login?next=/dashboard/parametres"));
    }
    throw error;
  }

  // The state also names the provider the flow was started for; a mismatch
  // means the session changed mid-flow, so the exchange is abandoned.
  if (state.split(".")[0] !== providerId) {
    return back("etat-invalide");
  }

  try {
    const tokens = await exchangeCode(code);
    await saveConnection(providerId, tokens);

    await prisma.auditLog.create({
      data: {
        providerId,
        action: "google.calendar.connected",
        entityType: "CalendarConnection",
        metadata: { account: tokens.email },
      },
    });

    // Pull the current busy periods straight away so availability is correct
    // before the provider looks at it.
    await syncBusyPeriods(providerId).catch(() => undefined);

    return back("connecte");
  } catch (error) {
    const message = error instanceof Error ? error.message : "echec";
    await prisma.calendarConnection
      .updateMany({ where: { providerId }, data: { lastSyncError: message } })
      .catch(() => undefined);
    return back("echec");
  }
}

function back(result: string): NextResponse {
  return NextResponse.redirect(appUrl(`/dashboard/parametres?google=${result}`));
}
