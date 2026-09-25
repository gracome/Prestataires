import Link from "next/link";
import { prisma } from "@/lib/db";

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
 * than pointing nowhere — fill it in with a WhatsApp link such as
 * https://wa.me/229XXXXXXXX, or a mailto: address.
 */
const CONTACT_URL = "";

type Plan = {
  id: string;
  name: string;
  emoji: string;
  monthly: number;
  yearly: number;
  pitch: string;
  /** Named so each card says what it builds on instead of repeating it. */
  includes?: string;
  features: string[];
  recommended?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    emoji: "🤍",
    monthly: 4000,
    yearly: 48000,
    pitch: "Pour une présence professionnelle en ligne.",
    features: [
      "Site web professionnel personnalisé",
      "Page d'accueil et présentation de l'activité",
      "Services et tarifs",
      "Galerie photos",
      "Horaires d'ouverture et localisation",
      "Contact et WhatsApp",
      "Questions fréquentes",
      "Espace de gestion du site",
    ],
  },
  {
    id: "rendez-vous",
    name: "Rendez-vous",
    emoji: "📅",
    monthly: 6000,
    yearly: 72000,
    pitch: "Pour gérer facilement les prises de rendez-vous.",
    includes: "Essentiel",
    recommended: true,
    features: [
      "Réservation en ligne",
      "Gestion des disponibilités et du calendrier",
      "Confirmation et refus des rendez-vous",
      "Confirmations par email",
      "Historique des rendez-vous",
      "Synchronisation Google Calendar",
    ],
  },
  {
    id: "business",
    name: "Business",
    emoji: "👑",
    monthly: 10000,
    yearly: 120000,
    pitch: "Pour gérer son activité et déléguer certaines tâches.",
    includes: "Rendez-vous",
    features: [
      "Caisse et suivi des encaissements",
      "Ventes au comptoir, tous moyens de paiement",
      "Gestion des acomptes et instructions de paiement",
      "Réception et vérification des preuves de paiement",
      "Collaborateurs, rôles et permissions",
      "Demandes de devis",
      "Statistiques d'activité et suivi des clients",
      "Rappels automatiques avant rendez-vous",
    ],
  },
];

const MODULES: Array<{ name: string; yearly: number }> = [
  { name: "Réservation en ligne", yearly: 30000 },
  { name: "Gestion des collaborateurs", yearly: 20000 },
  { name: "Caisse", yearly: 15000 },
  { name: "Gestion des acomptes", yearly: 15000 },
  { name: "Google Calendar", yearly: 10000 },
  { name: "Demandes de devis", yearly: 10000 },
  { name: "Statistiques", yearly: 10000 },
  { name: "Rappels automatiques", yearly: 10000 },
];

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
          <div className="container" style={{ maxWidth: 720 }}>
            <p className="eyebrow">Site professionnel et réservation en ligne</p>
            <h1
              className="font-display"
              style={{ fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.1, margin: ".5rem 0 1rem" }}
            >
              Votre site, vos prestations, vos rendez-vous.
            </h1>
            <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--brand-muted)", margin: "0 0 2rem" }}>
              Une solution pensée pour les prestataires qui travaillent sur
              rendez-vous : coiffeuses, prothésistes ongulaires, lash artists,
              esthéticiennes, barbiers, tatoueurs, praticiens bien-être. Un site
              à votre image, un agenda qui se gère tout seul, et des acomptes
              vérifiés sans échanger dix messages.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
              <Link href="#tarifs" className="btn btn-primary">
                Voir les tarifs
              </Link>
              <Link href="/login" className="btn btn-secondary">
                Accéder à mon espace
              </Link>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              <Feature
                title="Réservation en ligne"
                body="Vos clientes choisissent une prestation, voient vos vraies disponibilités et réservent. Les doubles réservations sont impossibles."
              />
              <Feature
                title="Acompte vérifié"
                body="La cliente vous paie directement sur votre Mobile Money, envoie sa capture, vous confirmez. Le créneau se libère seul si rien n'arrive."
              />
              <Feature
                title="Agenda synchronisé"
                body="Vos rendez-vous confirmés arrivent dans votre Google Calendar, et vos occupations personnelles bloquent les créneaux."
              />
              <Feature
                title="Moins de WhatsApp"
                body="Tarifs, durées, horaires et questions fréquentes sont sur votre site. Vous répondez moins souvent aux mêmes messages."
              />
              <Feature
                title="À votre image"
                body="Couleurs, polices, photos, textes et sections se règlent depuis votre tableau de bord, sans toucher au code."
              />
              <Feature
                title="Pensé pour le téléphone"
                body="Vos clientes réservent depuis leur mobile, et vous gérez votre journée depuis le vôtre."
              />
            </div>
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
                Un abonnement annuel, sans commission sur vos rendez-vous.
              </h2>
              <p style={{ margin: 0, color: "var(--brand-muted)", lineHeight: 1.7 }}>
                Vos clientes vous paient directement, sur votre propre compte.
                Nous ne prenons rien au passage.
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
              {PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
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
                {MODULES.map((module, index) => (
                  <li
                    key={module.name}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "1rem",
                      padding: ".85rem 1.1rem",
                      borderTop: index === 0 ? "none" : "1px solid var(--brand-border)",
                    }}
                  >
                    <span>{module.name}</span>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {fcfa(module.yearly)} F
                      <span style={{ fontWeight: 400, color: "var(--brand-muted)" }}>/an</span>
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
  return (
    <div
      className="card"
      style={{
        display: "grid",
        gap: ".9rem",
        // The recommended plan carries a ring rather than a different
        // background, so all three stay equally readable.
        border: plan.recommended
          ? "2px solid var(--brand-primary)"
          : "1px solid var(--brand-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
        <span aria-hidden="true">{plan.emoji}</span>
        <span className="font-display" style={{ fontSize: "1.15rem" }}>
          {plan.name}
        </span>
        {plan.recommended ? (
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
            {fcfa(plan.monthly)} F
          </span>
          <span style={{ color: "var(--brand-muted)", fontSize: ".9rem" }}>/ mois</span>
        </p>
        <p style={{ margin: ".35rem 0 0", color: "var(--brand-muted)", fontSize: ".88rem" }}>
          soit {fcfa(plan.yearly)} FCFA par an
        </p>
      </div>

      <p style={{ margin: 0, color: "var(--brand-muted)", lineHeight: 1.6, fontSize: ".92rem" }}>
        {plan.pitch}
      </p>

      {plan.includes ? (
        <p
          style={{
            margin: 0,
            fontSize: ".88rem",
            fontWeight: 700,
            paddingBottom: ".5rem",
            borderBottom: "1px solid var(--brand-border)",
          }}
        >
          Tout {plan.includes}, plus :
        </p>
      ) : null}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".45rem" }}>
        {plan.features.map((feature) => (
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

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
      <p style={{ margin: ".5rem 0 0", color: "var(--brand-muted)", lineHeight: 1.7, fontSize: ".92rem" }}>
        {body}
      </p>
    </div>
  );
}
