import { cookies } from "next/headers";
import type { Provider, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { env, isProduction } from "@/lib/env";

/**
 * Server-side sessions.
 *
 * The cookie carries a 256-bit random token; the database stores only its
 * SHA-256 digest. A leaked database backup therefore cannot be replayed as a
 * login, and revoking a session takes effect on the very next request.
 */

export type SessionUser = User & { provider: Provider | null };

/**
 * Who is signed in, and on whose behalf.
 *
 *  is set only while a platform administrator is working
 * inside a provider's account. Every screen can therefore say so out loud
 * rather than letting the administrator forget whose data is on the table.
 */
export type SessionContext = {
  user: SessionUser;
  impersonator: User | null;
};

export async function createSession(
  userId: string,
  meta: {
    userAgent?: string | null;
    ipAddress?: string | null;
    /** The administrator opening this session on the user's behalf. */
    impersonatorId?: string | null;
  } = {},
): Promise<void> {
  const token = randomToken();
  const ttlHours = env().SESSION_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      impersonatorId: meta.impersonatorId ?? null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(env().SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const name = env().SESSION_COOKIE_NAME;
  const token = store.get(name)?.value;

  if (token) {
    await prisma.session
      .updateMany({
        where: { tokenHash: sha256(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  store.delete(name);
}

/** Revoke every session of a user, for example after a password change. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getSessionContext())?.user ?? null;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const store = await cookies();
  const token = store.get(env().SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { provider: true } }, impersonator: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt <= new Date()) return null;
  if (!session.user.active) return null;

  // An administrator who has been disabled loses their borrowed sessions too,
  // otherwise revoking their access would leave a door open behind them.
  if (session.impersonator && !session.impersonator.active) return null;

  return { user: session.user, impersonator: session.impersonator };
}

/** Delete sessions that are long past their expiry. Called by the cron job. */
export async function purgeExpiredSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 3_600_000);
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return result.count;
}
