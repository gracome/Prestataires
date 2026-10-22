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

/**
 * How stale the activity stamp may get before it is written again.
 *
 * Five minutes: the idle window is measured in hours, so this costs nothing
 * in accuracy and saves a database write on all but the first request of each
 * five-minute stretch.
 */
const TOUCH_AFTER_MS = 5 * 60_000;

export async function getSessionContext(): Promise<SessionContext | null> {
  const store = await cookies();
  const token = store.get(env().SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { provider: true } }, impersonator: true },
  });

  const now = new Date();

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt <= now) return null;
  if (!session.user.active) return null;

  // Idle timeout. The absolute expiry above says how long a session may live;
  // this says how long it may be left alone. In a salon — a shared tablet, a
  // borrowed phone, the cybercafé on the corner — a window nobody came back to
  // is the likelier way a session leaks than any attack on the cookie.
  const idleMs = env().SESSION_IDLE_HOURS * 3_600_000;
  if (now.getTime() - session.lastSeenAt.getTime() > idleMs) return null;

  // Refresh the stamp as she works, but not on every request: this runs on
  // every page of the dashboard, and a write per navigation would be a lot of
  // writes to buy a precision nobody needs. A twelve-hour window does not care
  // about five minutes.
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: now } })
      .catch(() => undefined);
  }

  // An administrator who has been disabled loses their borrowed sessions too,
  // otherwise revoking their access would leave a door open behind them.
  if (session.impersonator && !session.impersonator.active) return null;

  return { user: session.user, impersonator: session.impersonator };
}

/** Delete sessions that are long past their expiry. Called by the cron job. */
export async function purgeExpiredSessions(): Promise<number> {
  const now = Date.now();

  // Sessions the idle window has already killed are refused on every read, but
  // they still sit in the table as rows with no revokedAt — which makes them
  // look open to anyone reading the data rather than running the check. Mark
  // them, so the table says what is true.
  await prisma.session
    .updateMany({
      where: {
        revokedAt: null,
        lastSeenAt: { lt: new Date(now - env().SESSION_IDLE_HOURS * 3_600_000) },
      },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);

  const cutoff = new Date(now - 30 * 24 * 3_600_000);
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return result.count;
}
