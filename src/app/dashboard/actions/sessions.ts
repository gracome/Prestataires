"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sha256 } from "@/lib/crypto";
import { requireUserPage } from "@/lib/auth/guard";
import { clientIp } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation";

/**
 * Close every session but this one.
 *
 * The one case this exists for is the one nobody plans: a phone left at the
 * salon, a tablet lent to someone, a browser on a machine in a cybercafé. The
 * idle timeout eventually closes those on its own; this is for the moment she
 * remembers and wants it shut now.
 *
 * It spares the current session on purpose. Logging herself out as well would
 * turn "secure my account" into "and now find your password", which is how a
 * safety control stops being used.
 */
export async function revokeOtherSessions(): Promise<ActionState> {
  const user = await requireUserPage("/dashboard/parametres");

  const store = await cookies();
  const token = store.get(env().SESSION_COOKIE_NAME)?.value;

  const result = await prisma.session.updateMany({
    where: {
      userId: user.id,
      revokedAt: null,
      // Identified by the hash of the cookie in hand, never by an id passed
      // in: there is no parameter here a caller could bend towards somebody
      // else's session.
      ...(token ? { tokenHash: { not: sha256(token) } } : {}),
    },
    data: { revokedAt: new Date() },
  });

  if (result.count > 0) {
    await prisma.auditLog
      .create({
        data: {
          providerId: user.providerId,
          userId: user.id,
          action: "auth.sessions.revoked",
          entityType: "Session",
          entityId: user.id,
          ipAddress: clientIp(await headers()),
        },
      })
      .catch(() => undefined);
  }

  revalidatePath("/dashboard/parametres");

  return {
    status: "success",
    message:
      result.count === 0
        ? "Aucun autre appareil n'était connecté."
        : result.count === 1
          ? "Un autre appareil a été déconnecté."
          : `${result.count} autres appareils ont été déconnectés.`,
  };
}
