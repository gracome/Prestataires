import type { Plan, PlanFeature, UserRole } from "@prisma/client";
import { PLANS } from "@/lib/plans/catalogue";
import { canAccess, type Section } from "./permissions";

/**
 * What a provider has paid for.
 *
 * This is the second half of access control, and it answers a different
 * question from permissions.ts. That file asks *who* is signed in — an owner
 * or an employee. This one asks what the business subscribes to. Both have to
 * say yes: an owner on the Essentiel package may not open the till, and an
 * employee of a Business account may not open the reports.
 *
 * Like the role table, this list is the single source the menu is built from
 * and the guard refuses on, so a hidden entry is always also a refused URL.
 */

export type ProviderEntitlements = {
  plan: Plan;
  extraModules: PlanFeature[];
};

/** Everything the package grants, plus whatever was bought on top. */
export function featuresOf(provider: ProviderEntitlements): Set<PlanFeature> {
  return new Set<PlanFeature>([
    ...PLANS[provider.plan].grants,
    ...provider.extraModules,
  ]);
}

export function hasFeature(
  provider: ProviderEntitlements,
  feature: PlanFeature,
): boolean {
  return featuresOf(provider).has(feature);
}

/**
 * Which feature opens which screen.
 *
 * A section with no entry here belongs to every package: the showcase site,
 * its catalogue, its opening hours and the account's own settings are what
 * Essentiel is, and taking them away would leave nothing to sell.
 *
 * The calendar sits behind BOOKING rather than beside it. Without online
 * booking there are no appointments to display, so the screen would open on an
 * empty grid and read as a fault rather than as something not subscribed to.
 */
const SECTION_FEATURE: Partial<Record<Section, PlanFeature>> = {
  bookings: "BOOKING",
  calendar: "BOOKING",
  till: "TILL",
  quotes: "QUOTES",
  reports: "REPORTS",
  payment: "DEPOSITS",
};

export function sectionFeature(section: Section): PlanFeature | null {
  return SECTION_FEATURE[section] ?? null;
}

/**
 * The whole rule, role and subscription together. Used by the menu and by the
 * guard so the two cannot disagree.
 */
export function canOpenSection(
  role: UserRole,
  section: Section,
  features: ReadonlySet<PlanFeature> | readonly PlanFeature[],
): boolean {
  if (!canAccess(role, section)) return false;

  const required = sectionFeature(section);
  if (!required) return true;

  const owned = features instanceof Set ? features : new Set(features);
  return owned.has(required);
}

/**
 * A Prisma filter matching the providers entitled to one feature.
 *
 * Entitlement is a package plus a list of extras, which no single column can
 * express. Rather than loading every provider and filtering in memory, this
 * turns the rule back into something the database can answer.
 */
export function featureWhere(feature: PlanFeature) {
  const plans = (Object.keys(PLANS) as Plan[]).filter((plan) =>
    PLANS[plan].grants.includes(feature),
  );

  return {
    OR: [{ plan: { in: plans } }, { extraModules: { has: feature } }],
  };
}
