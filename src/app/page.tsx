import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Platform landing page.
 *
 * Each provider lives at /{slug}; this page explains the product and points a
 * signed-out provider at their dashboard. It deliberately does not list the
 * providers on the platform: their client lists are not a directory.
 */
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
          style={{ display: "flex", alignItems: "center", gap: "1rem" }}
        >
          <span className="font-display" style={{ fontSize: "1.1rem", marginRight: "auto" }}>
            Prestataire
          </span>
          <Link href="/login" className="btn btn-secondary" style={{ padding: ".5rem 1.1rem", minHeight: 40, fontSize: ".9rem" }}>
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

            <Link href="/login" className="btn btn-primary">
              Accéder à mon espace
            </Link>
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
