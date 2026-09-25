import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireProviderApi, AuthorizationError } from "@/lib/auth/guard";
import {
  consentUrl,
  isGoogleConfigured,
  OAUTH_STATE_COOKIE,
} from "@/lib/google/oauth";
import { randomToken, sha256 } from "@/lib/crypto";
import { isProduction } from "@/lib/env";

/**
 * GET /api/google/connect
 *
 * Starts the OAuth 2.0 consent flow (cahier des charges section 14).
 *
 * The `state` parameter carries a random nonce whose digest is also set as a
 * short-lived cookie. The callback only proceeds when the two match, which is
 * what stops a third party from completing the flow on the provider's behalf.
 */

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const { provider } = await requireProviderApi();

    if (!isGoogleConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Calendar n'est pas configuré sur cette installation (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI).",
        },
        { status: 501 },
      );
    }

    const nonce = randomToken(24);
    const state = `${provider.id}.${nonce}`;

    const store = await cookies();
    store.set(OAUTH_STATE_COOKIE, sha256(state), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      path: "/",
      maxAge: 600,
    });

    return NextResponse.redirect(consentUrl(state));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.redirect(
        new URL("/login?next=/dashboard/parametres", process.env.APP_URL ?? "http://localhost:3000"),
      );
    }
    throw error;
  }
}
