import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * Google Calendar connection (cahier des charges section 14).
 *
 * OAuth 2.0 only: the platform never asks for and never stores a Google
 * password. Access and refresh tokens are encrypted with AES-256-GCM before
 * they are written, and decrypted only in memory when a call is made.
 */

/**
 * Cookie holding the digest of the OAuth `state` value.
 *
 * It lives here rather than in the route file because a Next.js route module
 * may only export request handlers and route config.
 */
export const OAUTH_STATE_COOKIE = "google_oauth_state";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
];

export class GoogleNotConfiguredError extends Error {
  constructor() {
    super(
      "Google Calendar is not configured: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.",
    );
    this.name = "GoogleNotConfiguredError";
  }
}

export function isGoogleConfigured(): boolean {
  const config = env();
  return Boolean(
    config.GOOGLE_CLIENT_ID &&
      config.GOOGLE_CLIENT_SECRET &&
      config.GOOGLE_REDIRECT_URI,
  );
}

export function oauthClient(): OAuth2Client {
  const config = env();
  if (!isGoogleConfigured()) throw new GoogleNotConfiguredError();

  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI,
  );
}

export function consentUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    // `consent` guarantees a refresh token even when the provider has already
    // authorised the app once before.
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export type ExchangeResult = {
  accessToken: string;
  refreshToken: string;
  expiryDate: Date;
  scope: string | null;
  email: string;
};

export async function exchangeCode(code: string): Promise<ExchangeResult> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token");
  }
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke the app in the Google account and connect again.",
    );
  }

  client.setCredentials(tokens);
  const info = await google.oauth2({ version: "v2", auth: client }).userinfo.get();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
    scope: tokens.scope ?? null,
    email: info.data.email ?? "compte Google",
  };
}

export async function saveConnection(
  providerId: string,
  result: ExchangeResult,
  calendarId = "primary",
): Promise<void> {
  const data = {
    googleAccount: result.email,
    accessToken: encryptSecret(result.accessToken),
    refreshToken: encryptSecret(result.refreshToken),
    tokenExpiry: result.expiryDate,
    scope: result.scope,
    calendarId,
    syncEnabled: true,
    lastSyncError: null,
  };

  await prisma.calendarConnection.upsert({
    where: { providerId },
    create: { providerId, ...data },
    update: data,
  });
}

export async function disconnect(providerId: string): Promise<void> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { providerId },
  });
  if (!connection) return;

  // Best effort: tell Google to drop the grant, then forget the tokens.
  try {
    const client = oauthClient();
    await client.revokeToken(decryptSecret(connection.refreshToken));
  } catch {
    // A revoked or already-expired grant still has to be removed locally.
  }

  await prisma.calendarConnection.delete({ where: { providerId } });
  await prisma.timeBlock.deleteMany({
    where: { providerId, type: "EXTERNAL_CALENDAR" },
  });
}

/**
 * An authorised client for a provider, refreshing the access token when it is
 * close to expiry and writing the new one back, still encrypted.
 */
export async function authorisedClient(
  providerId: string,
): Promise<OAuth2Client | null> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { providerId },
  });

  if (!connection || !connection.syncEnabled) return null;
  if (!isGoogleConfigured()) return null;

  const client = oauthClient();
  client.setCredentials({
    access_token: decryptSecret(connection.accessToken),
    refresh_token: decryptSecret(connection.refreshToken),
    expiry_date: connection.tokenExpiry.getTime(),
  });

  // Refresh a minute early rather than racing the expiry.
  if (connection.tokenExpiry.getTime() - Date.now() < 60_000) {
    const refreshed = await client.refreshAccessToken().catch(() => null);
    if (!refreshed) {
      await prisma.calendarConnection.update({
        where: { providerId },
        data: {
          lastSyncError:
            "Le jeton Google a expiré. Reconnectez votre calendrier depuis les paramètres.",
        },
      });
      return null;
    }

    const tokens = refreshed.credentials;
    await prisma.calendarConnection.update({
      where: { providerId },
      data: {
        accessToken: encryptSecret(tokens.access_token ?? ""),
        ...(tokens.refresh_token
          ? { refreshToken: encryptSecret(tokens.refresh_token) }
          : {}),
        tokenExpiry: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
        lastSyncError: null,
      },
    });
  }

  return client;
}
