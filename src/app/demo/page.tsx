import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { demoTarget } from "@/lib/demo";
import { enterDemoDashboard } from "./actions";

/**
 * The live preview.
 *
 * Two doors into one real account filled with invented data: the site a client
 * would open, and the dashboard its owner works from. Neither is a mock — both
 * are the ordinary routes, so whatever a visitor finds working here is working
 * for the same reason it will work for her.
 *
 * The page exists only where the installation has a demo configured. Elsewhere
 * it is a 404 rather than an empty invitation.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Voir la démonstration — Prestataires",
  description:
    "Parcourez un site de prestataire et son tableau de bord, remplis de données fictives. Rien à installer, aucun compte à créer.",
  // A demonstration account competing with real providers in search results
  // would be a poor trade for everyone involved.
  robots: { index: false, follow: false },
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ trop?: string }>;
}) {
  const demo = await demoTarget();
  if (!demo) notFound();

  const { trop } = await searchParams;

  return (
    <div className="mk">
      <header className="mk-topbar">
        <div className="container">
          <Link href="/" className="mk-back">
            ← Prestataires
          </Link>
          <Link href="/#tarifs" className="mk-topbar-cta">
            Voir les tarifs
          </Link>
        </div>
      </header>

      <main className="mk-section">
        <div className="container">
          <div className="mk-head">
            <p className="mk-eyebrow">Démonstration</p>
            <h1 className="mk-h2">
              Entrez, regardez, touchez à tout.
            </h1>
            <p className="mk-lead">
              Voici une vraie activité — <strong>{demo.businessName}</strong> —
              avec ses prestations, ses photos, ses horaires et plusieurs mois
              de rendez-vous. Tout est inventé, rien n&apos;est fragile : vous
              pouvez réserver, confirmer, encaisser, modifier.
            </p>
          </div>

          {trop ? (
            <p className="mk-note" role="alert">
              Trop d&apos;ouvertures coup sur coup. Patientez une minute et
              réessayez.
            </p>
          ) : null}

          <div className="mk-doors">
            <article className="mk-door">
              <p className="mk-door-side">Côté cliente</p>
              <h2>Son site</h2>
              <p>
                Ce que voit une cliente qui reçoit le lien : les prestations,
                les réalisations, les horaires, et la prise de rendez-vous de
                bout en bout.
              </p>
              <Link href={`/${demo.slug}`} className="mk-btn">
                Ouvrir le site →
              </Link>
            </article>

            <article className="mk-door">
              <p className="mk-door-side">Côté vous</p>
              <h2>Son tableau de bord</h2>
              <p>
                L&apos;agenda, la caisse, les prestations, les clientes et les
                chiffres du mois. Vous y entrez directement, sans compte et
                sans mot de passe à recopier.
              </p>
              {/* The form is the whole control: a server action, no input, and
                  the account it opens is fixed in the environment. */}
              <form action={enterDemoDashboard}>
                <button type="submit" className="mk-btn">
                  Ouvrir le tableau de bord →
                </button>
              </form>
            </article>
          </div>

          <p className="mk-board-fine mk-doors-note">
            La démonstration est partagée : ce que vous y changez, quelqu&apos;un
            d&apos;autre le verra, et ce qu&apos;il a changé avant vous est
            peut-être déjà là. Si vous réservez en donnant votre adresse, la
            confirmation vous arrivera pour de vrai — c&apos;est le même envoi
            que celui que recevraient vos clientes.
          </p>
        </div>
      </main>

      <section className="dm-foot">
        <div className="container">
          <h2>Ça vous parle ?</h2>
          <p>
            Vous auriez la même chose, avec vos prestations, vos tarifs et votre
            adresse. Il n&apos;y a rien à installer.
          </p>
          <div className="dm-foot-actions">
            <Link href="/#tarifs" className="mk-btn">
              Voir les tarifs
            </Link>
            <Link href="/#nous" className="mk-btn mk-btn-ghost">
              Qui sommes-nous
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
