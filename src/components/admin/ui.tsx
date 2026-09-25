import type { ProviderStatus } from "@prisma/client";

/**
 * The few pieces the platform needs on top of the dashboard's own.
 *
 * Everything else — cards, page headers, stat grids, skeletons, tables —
 * comes from `components/dashboard/ui`, because the platform area runs inside
 * the same `.admin` scope with its own palette. One set of components, two
 * palettes, no second design to keep in step.
 */

/** A titled card, used for every panel on the platform screens. */
export function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: ".75rem",
          flexWrap: "wrap",
          marginBottom: ".85rem",
        }}
      >
        <h2 style={{ fontSize: ".98rem", margin: 0, fontWeight: 700 }}>{title}</h2>
        {hint ? (
          <span style={{ fontSize: ".8rem", color: "var(--admin-muted)" }}>{hint}</span>
        ) : null}
        {action ? <span style={{ marginLeft: "auto" }}>{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

const STATUS: Record<ProviderStatus, { label: string; tone: string }> = {
  ACTIVE: { label: "En ligne", tone: "success" },
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SUSPENDED: { label: "Suspendue", tone: "danger" },
};

export function StatusTag({ status }: { status: ProviderStatus }) {
  const entry = STATUS[status];
  return <span className={`pill pill-${entry.tone}`}>{entry.label}</span>;
}

/** Dates on the platform are absolute: "il y a 3 jours" hides the year. */
export function formatMoment(value: Date | null, timezone = "Africa/Porto-Novo"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(value);
}

export function formatDay(value: Date | null, timezone = "Africa/Porto-Novo"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: timezone,
  }).format(value);
}
