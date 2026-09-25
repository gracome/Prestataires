"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { fieldErrors, loginSchema, type ActionState } from "@/lib/validation";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { homeFor } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

/**
 * Sign-in (cahier des charges section 23).
 *
 * Three defences against guessing: a per-address rate limit, a persistent
 * failure counter that locks the account for fifteen minutes, and one single
 * error message whatever went wrong, so the form never reveals which
 * addresses exist.
 */

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const GENERIC_ERROR = "Identifiants incorrects.";

export async function login(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  const limit = rateLimit(`login:${ip}`, LIMITS.login.limit, LIMITS.login.windowSeconds);
  if (!limit.allowed) {
    return {
      status: "error",
      message: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Merci de vérifier vos identifiants.",
      errors: fieldErrors(parsed.error),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Hash a throwaway value when the account does not exist, so a missing
  // account does not answer measurably faster than a wrong password.
  if (!user) {
    await verifyPassword(parsed.data.password, PLACEHOLDER_HASH);
    return { status: "error", message: GENERIC_ERROR };
  }

  if (!user.active) {
    return {
      status: "error",
      message: "Ce compte est désactivé. Contactez l'administrateur.",
    };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      status: "error",
      message: "Compte temporairement bloqué après plusieurs échecs. Réessayez dans quelques minutes.",
    };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!valid) {
    const failures = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failures,
        lockedUntil:
          failures >= MAX_FAILURES
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : null,
      },
    });
    return { status: "error", message: GENERIC_ERROR };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  await createSession(user.id, {
    userAgent: requestHeaders.get("user-agent"),
    ipAddress: ip,
  });

  await prisma.auditLog.create({
    data: {
      providerId: user.providerId,
      userId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
    },
  });

  const next = String(formData.get("next") ?? "/dashboard");
  redirect(safeRedirect(next, user.role));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * Only same-origin paths are accepted, so a crafted `next` parameter cannot
 * bounce a freshly signed-in provider to another site.
 */
function safeRedirect(target: string, role: UserRole = "PROVIDER"): string {
  // Each role has its own front door. A platform administrator has no provider
  // account, and an employee has no business landing on the turnover, so
  // neither can default to the dashboard home.
  const home = homeFor(role);

  if (!target.startsWith("/") || target.startsWith("//")) return home;
  if (target === "/dashboard" && home !== "/dashboard") return home;
  return target;
}

/** A real bcrypt hash of a value nobody knows, used only for timing parity. */
const PLACEHOLDER_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7oKZKRRkYFxvRhLgVaEAcZcTVxqPKJi";
