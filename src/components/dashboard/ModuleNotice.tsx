import type { PlanFeature } from "@prisma/client";
import { FEATURES } from "@/lib/plans/catalogue";

/**
 * Why a screen would not open.
 *
 * The guard redirects rather than showing a locked page, which is the right
 * behaviour — a screen that cannot be used should not be drawn. But a silent
 * redirect looks like the click missed, so the reason is carried in the query
 * and said here, once, in plain terms.
 */
export function ModuleNotice({ feature }: { feature?: string }) {
  if (!feature || !(feature in FEATURES)) return null;
  const definition = FEATURES[feature as PlanFeature];

  return (
    <div
      role="status"
      style={{
        border: "1px solid var(--admin-border, rgba(0,0,0,.12))",
        borderLeftWidth: 4,
        borderLeftColor: "var(--brand-primary, #b0797a)",
        borderRadius: 10,
        padding: ".85rem 1rem",
        margin: "0 0 1.2rem",
        background: "var(--admin-surface, #fff)",
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, fontSize: ".92rem" }}>
        {definition.label} n&apos;est pas inclus dans votre abonnement
      </p>
      <p
        style={{
          margin: ".3rem 0 0",
          fontSize: ".86rem",
          lineHeight: 1.6,
          color: "var(--admin-muted, #6b5f5a)",
        }}
      >
        {definition.covers}. Contactez-nous pour ajouter ce module — vos données
        et vos réglages sont conservés.
      </p>
    </div>
  );
}
