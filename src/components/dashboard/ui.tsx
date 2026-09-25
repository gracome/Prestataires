import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { statusLabelFr, statusTone } from "@/lib/booking/state-machine";

/** Small building blocks shared by the dashboard screens. */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
        flexWrap: "wrap",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <h1 style={{ fontSize: "1.45rem", margin: 0, fontWeight: 700 }}>{title}</h1>
        {description ? (
          <p
            style={{
              margin: ".4rem 0 0",
              color: "var(--admin-muted)",
              fontSize: ".92rem",
              lineHeight: 1.6,
              maxWidth: 620,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`pill pill-${statusTone(status)}`}>
      {statusLabelFr(status)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "attention";
}) {
  const body = (
    <div
      className="card"
      style={{
        height: "100%",
        borderColor: tone === "attention" ? "var(--tone-danger-border)" : undefined,
        background: tone === "attention" ? "var(--tone-danger-bg)" : undefined,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: ".78rem",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "var(--admin-muted)",
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p style={{ margin: ".4rem 0 0", fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1 }}>
        {value}
      </p>
      {hint ? (
        <p style={{ margin: ".35rem 0 0", fontSize: ".82rem", color: "var(--admin-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );

  if (!href) return body;

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      {body}
    </Link>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{ textAlign: "center", padding: "2.25rem 1.25rem" }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      {description ? (
        <p
          style={{
            margin: ".5rem auto 0",
            color: "var(--admin-muted)",
            fontSize: ".9rem",
            lineHeight: 1.6,
            maxWidth: 420,
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: "1.25rem" }}>{action}</div> : null}
    </div>
  );
}

export function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
}) {
  const palette = {
    info: { background: "var(--tone-info-bg)", color: "var(--tone-info-fg)", border: "var(--tone-info-border)" },
    warning: { background: "var(--tone-warning-bg)", color: "var(--tone-warning-fg)", border: "var(--tone-warning-border)" },
    danger: { background: "var(--tone-danger-bg)", color: "var(--tone-danger-fg)", border: "var(--tone-danger-border)" },
    success: { background: "var(--tone-success-bg)", color: "var(--tone-success-fg)", border: "var(--tone-success-border)" },
  }[tone];

  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : undefined}
      style={{
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: ".85rem 1rem",
        fontSize: ".9rem",
        lineHeight: 1.6,
        marginBottom: "1rem",
      }}
    >
      {children}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: ".85rem",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 700, flex: "1 1 auto" }}>
          {title}
        </h2>
        {action}
      </div>
      {description ? (
        <p
          style={{
            margin: "-.4rem 0 .85rem",
            color: "var(--admin-muted)",
            fontSize: ".88rem",
            lineHeight: 1.6,
            maxWidth: 640,
          }}
        >
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export const statGrid: React.CSSProperties = {
  display: "grid",
  gap: ".75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
};

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

/**
 * Placeholders shown while a section's data is still loading.
 *
 * Each dashboard page renders its title immediately and wraps only the parts
 * that query the database in a Suspense boundary. The page therefore appears
 * at once and fills in, instead of the whole screen staying blank.
 */
export function SkeletonBar({
  width = "100%",
  height = 14,
}: {
  width?: string;
  height?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        width,
        height,
        borderRadius: 6,
        background: "var(--admin-subtle)",
        animation: "admin-pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

/** Wraps any skeleton so assistive tech announces the wait once. */
export function SkeletonRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion label="Chargement des chiffres…">
      <div style={{ ...statGrid, marginBottom: "2rem" }}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="card">
            <SkeletonBar width="60%" height={11} />
            <div style={{ height: ".65rem" }} />
            <SkeletonBar width="40%" height={24} />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function SkeletonList({
  count = 3,
  label = "Chargement…",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <SkeletonRegion label={label}>
      <div style={{ display: "grid", gap: ".6rem" }}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="card">
            <SkeletonBar width="35%" height={14} />
            <div style={{ height: ".5rem" }} />
            <SkeletonBar width="65%" height={11} />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function SkeletonForm({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonRegion label="Chargement du formulaire…">
      <div className="card">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} style={{ marginBottom: "1rem" }}>
            <SkeletonBar width="28%" height={11} />
            <div style={{ height: ".4rem" }} />
            <SkeletonBar height={44} />
          </div>
        ))}
        <SkeletonBar width="180px" height={44} />
      </div>
    </SkeletonRegion>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <SkeletonRegion label="Chargement du tableau…">
      <div className="card">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              padding: ".7rem 0",
              borderBottom: index === rows - 1 ? "none" : "1px solid var(--admin-border)",
            }}
          >
            <SkeletonBar width="22%" height={12} />
            <SkeletonBar width="30%" height={12} />
            <SkeletonBar width="18%" height={12} />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <SkeletonRegion label="Chargement des photos…">
      <div
        style={{
          display: "grid",
          gap: ".7rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        }}
      >
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="card" style={{ padding: ".55rem" }}>
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 8,
                background: "var(--admin-subtle)",
                animation: "admin-pulse 1.4s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
