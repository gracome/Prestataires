import { redirect } from "next/navigation";
import type { Provider } from "@prisma/client";
import { getCurrentUser, getSessionContext, type SessionUser } from "./session";
import { canAccess, homeFor, type Section } from "./permissions";

/**
 * Access control (cahier des charges section 23).
 *
 * Every dashboard page and every provider API route goes through one of these.
 * `requireProvider` returns the caller's own provider, which is then the only
 * tenant id the handler may use: a provider can never read another one's data
 * by passing a different id in the request.
 */

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type ProviderContext = {
  user: SessionUser;
  provider: Provider;
};

/** For pages: redirects to the login screen when signed out. */
export async function requireUserPage(
  returnTo = "/dashboard",
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

export async function requireProviderPage(
  returnTo = "/dashboard",
): Promise<ProviderContext> {
  const user = await requireUserPage(returnTo);
  if (!user.provider) {
    redirect("/onboarding");
  }
  return { user, provider: user.provider };
}

/**
 * Guard for one section of the workspace.
 *
 * Called by every dashboard page, so an employee who types the address of a
 * screen she does not have is turned round the same way as one who clicks a
 * link that was never drawn for her. Hiding the menu entry is presentation;
 * this is the rule.
 */
export async function requireSection(
  section: Section,
): Promise<ProviderContext> {
  const context = await requireProviderPage();

  if (!canAccess(context.user.role, section)) {
    redirect(homeFor(context.user.role));
  }

  return context;
}

/** For API routes: throws instead of redirecting. */
export async function requireUserApi(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Authentification requise", 401);
  return user;
}

export async function requireProviderApi(
  section?: Section,
): Promise<ProviderContext> {
  const user = await requireUserApi();
  if (!user.provider) {
    throw new AuthorizationError("Aucun espace prestataire associé", 403);
  }
  if (section && !canAccess(user.role, section)) {
    throw new AuthorizationError("Cette partie est réservée à la responsable");
  }
  return { user, provider: user.provider };
}

/**
 * Guard for a record that belongs to a provider. Comparing ids here rather
 * than filtering in each query keeps the check impossible to forget.
 */
export function assertOwnedBy(
  record: { providerId: string } | null | undefined,
  provider: Provider,
): void {
  if (!record || record.providerId !== provider.id) {
    // Same message either way: a provider must not be able to tell an id that
    // exists elsewhere from one that does not exist at all.
    throw new AuthorizationError("Ressource introuvable", 403);
  }
}

// ---------------------------------------------------------------------------
// Platform administration
// ---------------------------------------------------------------------------

export type PlatformContext = {
  admin: SessionUser;
};

/**
 * Guard for the platform area.
 *
 * Being a platform administrator grants nothing inside a provider's data. It
 * grants the right to see aggregates, to create and suspend accounts, and to
 * open a support session that is recorded. Reading a provider's customers is
 * done by borrowing her account in the open, never from here.
 *
 * An administrator who is currently impersonating a provider is not treated as
 * an administrator: while borrowed, the session is the provider's, and the way
 * back out is to end it.
 */
export async function requirePlatformAdminPage(
  returnTo = "/admin",
): Promise<PlatformContext> {
  const context = await getSessionContext();

  if (!context) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (context.impersonator || context.user.role !== "PLATFORM_ADMIN") {
    redirect("/dashboard");
  }

  return { admin: context.user };
}

export async function requirePlatformAdminApi(): Promise<PlatformContext> {
  const context = await getSessionContext();

  if (!context) throw new AuthorizationError("Authentification requise", 401);
  if (context.impersonator || context.user.role !== "PLATFORM_ADMIN") {
    throw new AuthorizationError("Réservé à l'administration de la plateforme");
  }

  return { admin: context.user };
}
