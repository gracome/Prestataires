"use client";

import type { ReactNode } from "react";
import { Carousel } from "@/components/ui/Carousel";

/**
 * The product tour beside the headline.
 *
 * Drawn in markup rather than shown as screenshots: it stays sharp at every
 * size, it is readable by a screen reader, and it cannot go stale the way an
 * exported image does the first time a screen changes.
 */

export function ProductTour() {
  return (
    <Carousel
      ariaLabel="Aperçu de la plateforme"
      intervalMs={5000}
      showLabels
      slides={[
        { key: "booking", label: "Réservation", content: <BookingSlide /> },
        { key: "dashboard", label: "Tableau de bord", content: <DashboardSlide /> },
        { key: "deposit", label: "Acompte", content: <DepositSlide /> },
        { key: "site", label: "Site professionnel", content: <SiteSlide /> },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------

function Frame({ children, tone = "surface" }: { children: ReactNode; tone?: "surface" | "cream" }) {
  return (
    <div
      style={{
        background:
          tone === "cream" ? "var(--brand-cream)" : "var(--brand-surface)",
        border: "1px solid var(--brand-border)",
        borderRadius: 24,
        padding: "1.35rem",
        // Warm rather than grey: a neutral shadow on cream looks like dirt.
        boxShadow: "0 24px 60px -32px rgb(59 41 39 / 28%)",
        display: "grid",
        gap: ".9rem",
        minHeight: 360,
        alignContent: "start",
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "rose" }: { children: ReactNode; tone?: "rose" | "success" }) {
  const rose = tone === "rose";
  return (
    <span
      style={{
        justifySelf: "start",
        fontSize: ".74rem",
        fontWeight: 600,
        padding: ".3rem .7rem",
        borderRadius: 999,
        background: rose ? "var(--brand-rose-light)" : "var(--tone-success-bg)",
        color: rose ? "var(--brand-chocolate)" : "var(--tone-success-fg)",
      }}
    >
      {children}
    </span>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: "var(--font-heading)",
        fontSize: "1.15rem",
        lineHeight: 1.25,
      }}
    >
      {children}
    </p>
  );
}

const muted = {
  margin: 0,
  fontSize: ".85rem",
  color: "var(--brand-muted)",
  lineHeight: 1.6,
} as const;

// ---------------------------------------------------------------------------

function BookingSlide() {
  const slots = ["09:00", "10:30", "14:00", "16:00"];

  return (
    <Frame>
      <Pill>✨ Nouveau rendez-vous</Pill>
      <Title>Réserver un rendez-vous</Title>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".7rem",
          padding: ".75rem .9rem",
          borderRadius: 16,
          background: "var(--brand-rose-pale)",
        }}
      >
        <span style={{ fontSize: "1.4rem" }} aria-hidden="true">
          💅🏾
        </span>
        <span>
          <span style={{ display: "block", fontWeight: 600 }}>Pose gel</span>
          <span style={{ ...muted, display: "block", fontSize: ".8rem" }}>
            45 min · 15 000 FCFA
          </span>
        </span>
      </div>

      <p style={{ ...muted, fontWeight: 600, color: "var(--brand-text)" }}>
        28 septembre
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem" }}>
        {slots.map((slot) => {
          const chosen = slot === "14:00";
          return (
            <span
              key={slot}
              style={{
                padding: ".45rem .8rem",
                borderRadius: 999,
                fontSize: ".85rem",
                fontWeight: chosen ? 700 : 400,
                border: `1px solid ${chosen ? "var(--brand-primary)" : "var(--brand-border)"}`,
                background: chosen ? "var(--brand-primary)" : "transparent",
                color: chosen ? "var(--brand-primary-fg)" : "var(--brand-muted)",
              }}
            >
              {slot}
            </span>
          );
        })}
      </div>

      <span
        style={{
          justifySelf: "start",
          marginTop: ".2rem",
          padding: ".6rem 1.1rem",
          borderRadius: 999,
          background: "var(--brand-primary)",
          color: "var(--brand-primary-fg)",
          fontWeight: 600,
          fontSize: ".9rem",
        }}
      >
        Confirmer →
      </span>
    </Frame>
  );
}

function DashboardSlide() {
  const stats: Array<[string, string]> = [
    ["Aujourd'hui", "8 rendez-vous"],
    ["À confirmer", "2 acomptes"],
    ["Ce mois-ci", "245 000 FCFA"],
    ["Nouvelles clientes", "12"],
  ];

  return (
    <Frame tone="cream">
      <Title>Bonjour 👋🏾</Title>
      <p style={muted}>Voici comment se porte votre activité aujourd&apos;hui.</p>

      <div
        style={{
          display: "grid",
          gap: ".6rem",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        {stats.map(([label, value]) => (
          <div
            key={label}
            style={{
              background: "var(--brand-surface)",
              border: "1px solid var(--brand-border)",
              borderRadius: 16,
              padding: ".75rem .85rem",
            }}
          >
            <span style={{ ...muted, display: "block", fontSize: ".74rem" }}>
              {label}
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-heading)",
                fontSize: "1.05rem",
                marginTop: ".15rem",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: ".4rem", marginTop: ".2rem" }}>
        {[
          ["09:00", "Amina D.", "Pose gel"],
          ["10:30", "Isatou B.", "Manucure"],
        ].map(([time, name, service]) => (
          <div
            key={time}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".7rem",
              background: "var(--brand-surface)",
              border: "1px solid var(--brand-border)",
              borderRadius: 14,
              padding: ".55rem .8rem",
              fontSize: ".85rem",
            }}
          >
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {time}
            </span>
            <span style={{ fontWeight: 600 }}>{name}</span>
            <span style={{ ...muted, marginLeft: "auto", fontSize: ".78rem" }}>
              {service}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function DepositSlide() {
  return (
    <Frame>
      <Pill>💗 Acompte reçu</Pill>
      <Title>Nouvelle réservation</Title>

      <div
        style={{
          display: "grid",
          gap: ".45rem",
          padding: ".85rem .95rem",
          borderRadius: 18,
          background: "var(--brand-rose-pale)",
          fontSize: ".9rem",
        }}
      >
        <span style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Pose gel</span>
          <strong>15 000 FCFA</strong>
        </span>
        <span
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "var(--brand-muted)",
          }}
        >
          <span>Acompte</span>
          <strong style={{ color: "var(--brand-text)" }}>5 000 FCFA</strong>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".6rem",
          fontSize: ".86rem",
          color: "var(--brand-muted)",
        }}
      >
        <span aria-hidden="true">📎</span> Preuve de paiement reçue
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".55rem",
          padding: ".7rem .9rem",
          borderRadius: 16,
          background: "var(--tone-success-bg)",
          color: "var(--tone-success-fg)",
          fontWeight: 600,
          fontSize: ".9rem",
        }}
      >
        <span aria-hidden="true">✓</span> Rendez-vous confirmé
      </div>

      <p style={muted}>
        La cliente vous paie directement. Vous vérifiez, vous confirmez, et le
        créneau se libère seul si rien n&apos;arrive.
      </p>
    </Frame>
  );
}

function SiteSlide() {
  return (
    <Frame>
      <Pill>🌸 Votre site est à jour</Pill>

      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid var(--brand-border)",
        }}
      >
        <div
          style={{
            height: 128,
            background:
              "linear-gradient(135deg, var(--brand-rose-light), var(--brand-beige))",
            display: "grid",
            placeItems: "center",
            fontSize: "2rem",
          }}
          aria-hidden="true"
        >
          💅🏾
        </div>

        <div style={{ padding: "1rem", display: "grid", gap: ".5rem" }}>
          <span
            style={{
              fontSize: ".72rem",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--brand-muted)",
            }}
          >
            Maya Beauty
          </span>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-heading)",
              fontSize: "1.25rem",
              lineHeight: 1.25,
            }}
          >
            Des ongles qui racontent votre style.
          </p>
          <span
            style={{
              justifySelf: "start",
              marginTop: ".3rem",
              padding: ".5rem 1rem",
              borderRadius: 999,
              background: "var(--brand-chocolate)",
              color: "var(--brand-cream)",
              fontSize: ".85rem",
              fontWeight: 600,
            }}
          >
            Réserver un rendez-vous →
          </span>
        </div>
      </div>

      <p style={muted}>
        Chaque prestataire choisit son univers. Sa cliente a l&apos;impression
        d&apos;être chez elle, pas dans un logiciel.
      </p>
    </Frame>
  );
}
