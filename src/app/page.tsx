import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  FEATURES,
  PLANS,
  PLAN_ORDER,
  planHighlights,
  expandRequirements,
  requirementLabels,
  sellableFeatures,
  yearlyPrice,
} from "@/lib/plans/catalogue";
import type { Plan, PlanFeature } from "@prisma/client";
import { ProductTour } from "@/components/marketing/ProductTour";
import { TemplateGallery } from "@/components/marketing/TemplateGallery";

export const dynamic = "force-dynamic";

/**
 * Platform landing page.
 *
 * Each provider lives at /{slug}; this page explains the product, prices it
 * and points a signed-out provider at their dashboard. It deliberately does
 * not list the providers on the platform: their client lists are not a
 * directory.
 */

/**
 * Where "sur mesure" enquiries go. Left empty the button disappears rather
 * than pointing nowhere.
 */
const CONTACT_URL = "https://wa.me/22969668879";

/**
 * The offer itself lives in src/lib/plans/catalogue.ts, which the guard and
 * the administration screens read too: a price quoted to a prospect here and
 * the features actually granted after payment come from one table.
 */
const SHOWN_PLANS = PLAN_ORDER;
/** 48000 -> "48 000", with a narrow no-break space holding the groups together. */
function fcfa(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/[  \s]/g, " ");
}

export default async function HomePage() {
  // Used only to show whether the installation has been set up yet.
  const providerCount = await prisma.provider
    .count({ where: { status: "ACTIVE" } })
    .catch(() => 0);

  return (
    <div style={{ minHeight: "100dvh" }}>
      <header
        style={{
          borderBottom: "1px solid var(--brand-border)",
          padding: "1rem 0",
        }}
      >
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", gap: ".5rem" }}
        >
          <span className="font-display" style={{ fontSize: "1.1rem", marginRight: "auto" }}>
            Prestataire
          </span>
          <Link
            href="#tarifs"
            className="btn btn-ghost"
            style={{ padding: ".5rem 1rem", minHeight: 40, fontSize: ".9rem" }}
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ padding: ".5rem 1.1rem", minHeight: 40, fontSize: ".9rem" }}
          >
            Espace prestataire
          </Link>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="container">
            <div className="hero-grid">
              <div>
                <p className="eyebrow">La plateforme des métiers de la beauté</p>
                <h1
                  className="font-display"
                  style={{
                    fontSize: "clamp(2.2rem, 6vw, 3.4rem)",
                    lineHeight: 1.08,
                    margin: ".6rem 0 1.1rem",
                  }}
                >
                  Votre activité.
                  <br />
                  Votre univers.
                  <br />
                  Une seule plateforme.
                </h1>

                <p
                  style={{
                    fontSize: "1.05rem",
                    lineHeight: 1.75,
                    color: "var(--brand-muted)",
                    margin: "0 0 1.8rem",
                    maxWidth: "46ch",
                  }}
                >
                  Gérez vos rendez-vous, vos clientes, vos paiements et toute
                  votre activité depuis un seul espace.
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
                  <Link href="#tarifs" className="btn btn-primary">
                    Commencer →
                  </Link>
                  <Link href="/login" className="btn btn-secondary">
                    Accéder à mon espace
                  </Link>
                </div>
              </div>

              <ProductTour />
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                lineHeight: 1.2,
                maxWidth: "20ch",
                margin: "0 0 1.75rem",
              }}
            >
              Tout ce qu&apos;il faut pour faire tourner votre activité.
            </h2>

            {/* Asymmetric on purpose: eight identical cards read as a list of
                specifications, and nobody reads a list of specifications. */}
            <div className="feature-mosaic">
              <FeatureCard
                wide
                title="Votre propre site"
                body="Un site à votre image, avec vos photos et votre univers. Pas un formulaire de réservation déguisé."
                figure={<SiteFigure />}
              />
              <FeatureCard
                title="Réservations"
                body="Vos clientes voient vos vraies disponibilités. Les doubles réservations sont impossibles."
                figure={<SlotsFigure />}
              />
              <FeatureCard
                title="Acomptes"
                body="Elle vous paie directement, envoie son reçu, vous confirmez."
                figure={<PaidFigure />}
              />
              <FeatureCard
                wide
                title="Votre équipe"
                body="Donnez un compte à celles qui travaillent avec vous. Elles gèrent l'agenda, pas vos chiffres."
                figure={<TeamFigure />}
              />
            </div>
          </div>
        </section>

        <section className="section" style={{ background: "var(--brand-rose-pale)" }}>
          <div className="container">
            <div className="hero-grid">
              <div>
                <p className="eyebrow">Avant</p>
                <div style={{ display: "grid", gap: ".5rem", marginTop: ".9rem" }}>
                  {BEFORE.map((line, index) => (
                    <p
                      key={line}
                      style={{
                        margin: 0,
                        justifySelf: index % 2 ? "end" : "start",
                        maxWidth: "82%",
                        background:
                          index % 2 ? "var(--brand-beige)" : "var(--brand-surface)",
                        border: "1px solid var(--brand-border)",
                        borderRadius: 16,
                        padding: ".6rem .9rem",
                        fontSize: ".9rem",
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <p className="eyebrow">Après</p>
                <h2
                  className="font-display"
                  style={{
                    fontSize: "clamp(1.5rem, 3.6vw, 2rem)",
                    lineHeight: 1.2,
                    margin: ".6rem 0 1.2rem",
                  }}
                >
                  Votre cliente réserve.
                  <br />
                  Vous vous occupez du reste.
                </h2>

                <ol
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gap: ".5rem",
                  }}
                >
                  {AFTER.map((step, index) => (
                    <li
                      key={step}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: ".75rem",
                        background: "var(--brand-surface)",
                        border: "1px solid var(--brand-border)",
                        borderRadius: 14,
                        padding: ".65rem .9rem",
                        fontSize: ".92rem",
                      }}
                    >
                      <span aria-hidden="true" className="step-number">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div style={{ maxWidth: 640, marginBottom: "1.75rem" }}>
              <p className="eyebrow">Votre site</p>
              <h2
                className="font-display"
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                  lineHeight: 1.2,
                  margin: ".5rem 0 .75rem",
                }}
              >
                Votre activité mérite son propre univers.
              </h2>
              <p style={{ margin: 0, color: "var(--brand-muted)", lineHeight: 1.7 }}>
                Un site professionnel pensé à votre image, pas un simple
                formulaire de réservation.
              </p>
            </div>

            <TemplateGallery />
          </div>
        </section>

        <section
          id="tarifs"
          className="section"
          style={{ scrollMarginTop: "1rem", background: "var(--brand-surface)" }}
        >
          <div className="container">
            <div style={{ maxWidth: 640, marginBottom: "2rem" }}>
              <p className="eyebrow">Nos packages</p>
              <h2
                className="font-display"
                style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", lineHeight: 1.2, margin: ".5rem 0 .75rem" }}
              >
                Un abonnement simple, sans commission sur vos rendez-vous.
              </h2>
              <p style={{ margin: 0, color: "var(--brand-muted)", lineHeight: 1.7 }}>
                Vos clientes vous paient directement, sur votre propre compte :
                nous ne prenons rien au passage. Payez au mois, ou réglez
                l&apos;année et profitez de <strong>deux mois offerts</strong>.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                alignItems: "start",
              }}
            >
              {SHOWN_PLANS.map((plan) => (
                <PlanCard key={plan} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div style={{ maxWidth: 640, marginBottom: "1.5rem" }}>
              <p className="eyebrow">Modules à la carte</p>
              <h2
                className="font-display"
                style={{ fontSize: "clamp(1.4rem, 3.5vw, 1.8rem)", lineHeight: 1.2, margin: ".5rem 0 .75rem" }}
              >
                Vous n&apos;avez besoin que de certaines fonctionnalités ?
              </h2>
              <p style={{ margin: 0, color: "var(--brand-muted)", lineHeight: 1.7 }}>
                Ajoutez un module à n&apos;importe quel package et composez votre
                propre solution.
              </p>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {sellableFeatures().map((feature, index) => (
                  <li
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "1rem",
                      padding: ".85rem 1.1rem",
                      borderTop: index === 0 ? "none" : "1px solid var(--brand-border)",
                    }}
                  >
                    <span>
                      {FEATURES[feature].label}
                      {requirementLabels(feature).length > 0 ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: ".78rem",
                            color: "var(--brand-muted)",
                          }}
                        >
                          avec {requirementLabels(feature).join(" et ")}
                        </span>
                      ) : null}
                    </span>
                    <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 700 }}>
                        {fcfa(moduleMonthly(feature))} F
                        <span style={{ fontWeight: 400, color: "var(--brand-muted)" }}>
                          /mois
                        </span>
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: ".82rem",
                          color: "var(--brand-muted)",
                        }}
                      >
                        {fcfa(yearlyPrice(moduleMonthly(feature)))} F/an
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ marginTop: "1rem", display: "grid", gap: ".75rem" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                Besoin d&apos;une configuration particulière ?
              </p>
              <p style={{ margin: 0, color: "var(--brand-muted)", lineHeight: 1.7, fontSize: ".92rem" }}>
                Nous composons votre solution sur mesure à partir de vos besoins
                réels.
              </p>
              {CONTACT_URL ? (
                <a href={CONTACT_URL} className="btn btn-primary" style={{ justifySelf: "start" }}>
                  Nous contacter
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--brand-border)", padding: "2rem 0" }}>
        <div className="container" style={{ fontSize: ".85rem", color: "var(--brand-muted)" }}>
          {providerCount > 0
            ? `${providerCount} prestataire${providerCount > 1 ? "s" : ""} en ligne sur cette plateforme.`
            : "Plateforme prête. Créez votre premier prestataire pour commencer."}
        </div>
      </footer>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const definition = PLANS[plan];
  const monthly = definition.monthly;
  return (
    <div
      className="card"
      style={{
        display: "grid",
        gap: ".9rem",
        // The recommended plan carries a ring rather than a different
        // background, so all three stay equally readable.
        border: definition.recommended
          ? "2px solid var(--brand-primary)"
          : "1px solid var(--brand-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
        <span aria-hidden="true">{definition.emoji}</span>
        <span className="font-display" style={{ fontSize: "1.15rem" }}>
          {definition.name}
        </span>
        {definition.recommended ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: ".7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--brand-primary)",
              border: "1px solid var(--brand-primary)",
              borderRadius: "var(--brand-radius)",
              padding: ".15rem .6rem",
              whiteSpace: "nowrap",
            }}
          >
            Recommandé
          </span>
        ) : null}
      </div>

      <div>
        <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: ".35rem" }}>
          <span className="font-display" style={{ fontSize: "1.9rem", lineHeight: 1 }}>
            {fcfa(monthly)} F
          </span>
          <span style={{ color: "var(--brand-muted)", fontSize: ".9rem" }}>/ mois</span>
        </p>

        <div
          style={{
            marginTop: ".6rem",
            padding: ".55rem .7rem",
            borderRadius: 12,
            background: "var(--brand-background)",
            border: "1px solid var(--brand-border)",
          }}
        >
          <p style={{ margin: 0, fontSize: ".9rem" }}>
            ou <strong>{fcfa(yearlyPrice(monthly))} F</strong> par an
          </p>
          <p
            style={{
              margin: ".15rem 0 0",
              fontSize: ".82rem",
              fontWeight: 700,
              color: "var(--brand-primary)",
            }}
          >
            2 mois offerts — vous économisez{" "}
            {fcfa(monthly * 12 - yearlyPrice(monthly))} F
          </p>
        </div>
      </div>

      <p style={{ margin: 0, color: "var(--brand-muted)", lineHeight: 1.6, fontSize: ".92rem" }}>
        {definition.pitch}
      </p>

      {definition.extends ? (
        <p
          style={{
            margin: 0,
            fontSize: ".88rem",
            fontWeight: 700,
            paddingBottom: ".5rem",
            borderBottom: "1px solid var(--brand-border)",
          }}
        >
          Tout {PLANS[definition.extends].name}, plus :
        </p>
      ) : null}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".45rem" }}>
        {planHighlights(plan).map((feature) => (
          <li
            key={feature}
            style={{
              display: "grid",
              gridTemplateColumns: "1rem 1fr",
              gap: ".5rem",
              fontSize: ".92rem",
              lineHeight: 1.5,
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--brand-primary)" }}>
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


/**
 * What a module costs on its own, everything it depends on included.
 *
 * Quoting the bare price would understate it: nobody can buy online payment
 * without the deposits it collects, so the figure a prospect compares has to
 * be the one she would actually pay.
 */
function moduleMonthly(feature: PlanFeature): number {
  return expandRequirements([feature]).reduce(
    (total, part) => total + FEATURES[part].monthly,
    0,
  );
}

/** The five messages every provider has sent a hundred times. */
const BEFORE = [
  "Tu peux venir à 15h ?",
  "Attends je regarde.",
  "Finalement 16h.",
  "Tu peux envoyer l'acompte ?",
  "Je n'ai pas encore vu le paiement.",
];

const AFTER = [
  "Choisit son service",
  "Choisit son créneau",
  "Réserve",
  "Paie son acompte",
  "Reçoit sa confirmation",
];

/**
 * A feature, told with a picture of itself.
 *
 * The wide ones carry a figure that needs room; the narrow ones carry a detail.
 * Alternating the two is what stops the section reading as a specification
 * sheet, which is the one thing nobody reads.
 */
function FeatureCard({
  title,
  body,
  figure,
  wide,
}: {
  title: string;
  body: string;
  figure: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <article className="card feature-card" data-wide={wide ? "true" : undefined}>
      <div className="feature-figure">{figure}</div>
      <div>
        <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
        <p
          style={{
            margin: ".4rem 0 0",
            color: "var(--brand-muted)",
            lineHeight: 1.65,
            fontSize: ".92rem",
          }}
        >
          {body}
        </p>
      </div>
    </article>
  );
}

function SiteFigure() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr",
        gap: ".4rem",
        height: "100%",
        minHeight: 120,
      }}
      aria-hidden="true"
    >
      {["💅🏾", "🌸", "✨"].map((emoji, index) => (
        <div
          key={emoji}
          style={{
            display: "grid",
            placeItems: "center",
            borderRadius: 14,
            fontSize: index === 0 ? "1.9rem" : "1.2rem",
            background:
              index === 0
                ? "linear-gradient(135deg, var(--brand-rose-light), var(--brand-beige))"
                : "var(--brand-rose-pale)",
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
}

function SlotsFigure() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem" }} aria-hidden="true">
      {["09:00", "10:30", "14:00", "16:00"].map((slot) => {
        const chosen = slot === "14:00";
        return (
          <span
            key={slot}
            style={{
              padding: ".35rem .65rem",
              borderRadius: 999,
              fontSize: ".78rem",
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
  );
}

function PaidFigure() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: ".5rem",
        padding: ".55rem .85rem",
        borderRadius: 14,
        background: "var(--tone-success-bg)",
        color: "var(--tone-success-fg)",
        fontWeight: 600,
        fontSize: ".85rem",
      }}
    >
      ✓ Paiement reçu
    </div>
  );
}

function TeamFigure() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }} aria-hidden="true">
      <div style={{ display: "flex" }}>
        {["A", "I", "D"].map((initial, index) => (
          <span
            key={initial}
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 999,
              background: index === 0 ? "var(--brand-primary)" : "var(--brand-beige)",
              color: index === 0 ? "var(--brand-primary-fg)" : "var(--brand-chocolate)",
              border: "2px solid var(--brand-surface)",
              marginLeft: index === 0 ? 0 : -10,
              fontSize: ".8rem",
              fontWeight: 700,
            }}
          >
            {initial}
          </span>
        ))}
      </div>
      <span style={{ fontSize: ".8rem", color: "var(--brand-muted)" }}>
        Agenda ✓ · Chiffres ✕
      </span>
    </div>
  );
}
