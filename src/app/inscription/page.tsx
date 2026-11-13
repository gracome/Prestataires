import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { SignupForm } from "@/components/marketing/SignupForm";
import { getCurrentUser } from "@/lib/auth/session";
import { PLANS, PLAN_ORDER } from "@/lib/plans/catalogue";
import { CONTACT, PRODUCT } from "@/lib/marketing/product";
import type { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Créer mon espace ${PRODUCT.name}`,
  description:
    "Ouvrez votre espace en deux minutes. Votre site reste invisible jusqu'au jour où vous le publiez.",
};

/**
 * The sign-up screen, for people who arrive straight at it.
 *
 * The same form lives in the last band of the landing page, which is where
 * most people will meet it. This page exists because the header points at it,
 * because a link sent over WhatsApp has to land somewhere, and because the
 * plan buttons on the price list need an address when the visitor is reading
 * a module page rather than the landing page.
 *
 * `?formule=` pre-selects a package, so a link can carry the choice.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ formule?: string }>;
}) {
  // Somebody already signed in has an account; sending her to a second one
  // would be a trap she cannot see.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const asked = (await searchParams).formule?.toUpperCase();
  const plan = PLAN_ORDER.includes(asked as Plan) ? (asked as Plan) : "RENDEZ_VOUS";

  return (
    <div className="mk bp">
      <MarketingHeader inner />

      <main>
        <section className="bp-band">
          <div className="container">
            <h1 className="bp-wide-title">Créez votre espace.</h1>
            <p className="bp-one bp-wide-one">
              Vous entrez tout de suite. Vous publiez quand vous voulez.
            </p>

            <div className="bp-enroll">
              <ol className="bp-steps">
                <li>
                  <b>Vous choisissez votre formule</b>
                  Changeable plus tard, sans perdre votre travail.
                </li>
                <li>
                  <b>Vous ouvrez votre espace</b>
                  Le nom du salon, votre métier, votre ville, votre numéro.
                </li>
                <li>
                  <b>Vous entrez tout de suite</b>
                  Pas d&apos;attente, pas de validation, pas de paiement.
                </li>
                <li>
                  <b>Vous préparez votre site</b>
                  Prestations, tarifs, horaires, photos. Rien n&apos;est visible
                  encore.
                </li>
                <li>
                  <b>Vous le publiez</b>
                  Depuis Paramètres, le jour où vous êtes prête.
                </li>
              </ol>

              <div className="bp-enroll-form">
                <SignupForm initialPlan={plan} />

                <p className="bp-form-note">
                  Vous avez déjà un compte ?{" "}
                  <Link href="/login">Se connecter</Link>. Une question ?{" "}
                  <a
                    href={CONTACT.whatsapp}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Écrivez-nous
                  </a>
                  , {PLANS[plan].name} à {PLANS[plan].monthly.toLocaleString("fr-FR")} F
                  par mois.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
