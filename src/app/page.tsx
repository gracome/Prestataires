import type { Metadata } from "next";
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
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { CONTACT, PRODUCT } from "@/lib/marketing/product";
import { DemoStudio } from "@/components/marketing/DemoStudio";
import { TRADES } from "@/lib/marketing/trades";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${PRODUCT.name}, le logiciel de réservation des métiers de la beauté`,
  description:
    "Un site de réservation à votre nom, un agenda qui ne se trompe pas et des acomptes encaissés. Sans commission sur vos rendez-vous.",
};

/**
 * Platform landing page.
 *
 * Written to a brief, finally, and the brief is six questions a visitor has in
 * this order: what is it, who is it for, how is it used, what does it cost, how
 * do I get it, who do I talk to. Every section answers exactly one of them, in
 * that order, and the heading of each section is the question itself.
 *
 * That ordering is the correction. The five arrangements before this one each
 * opened on a promise, a slogan or a photograph and left a visitor to work out
 * what she was looking at: "votre business mérite d'être beau" says nothing to
 * somebody who has not yet been told this is booking software. The promise is
 * the baseline, and it belongs on the logo, which is where it now is.
 *
 * Two standing constraints.
 *
 * No photographs: the library is borrowed stock, seven frames of which show
 * pale hands, which is not what a salon in Cotonou looks like. And no mock
 * screens: they read as a wireframe. What is left is type, large and well
 * spaced, plus the one real asset the brand has, its own logo.
 *
 * Nothing here is invented. The acquisition steps are the actual ones: there is
 * no public sign-up, provider creation is an administrator task (see
 * src/app/onboarding/page.tsx), the credentials arrive by letter and the site
 * goes live when she publishes it from Paramètres. If that flow ever changes,
 * this section has to change with it.
 *
 * It deliberately does not list the providers on the platform: their client
 * lists are not a directory.
 */

/** What she gets, in four nouns. The answer to "qu'est-ce que c'est". */
const INCLUDED = [
  {
    title: "Un site de réservation",
    body: "À votre nom, avec vos prestations, vos tarifs et vos photos. Une adresse à envoyer en story.",
  },
  {
    title: "Un agenda",
    body: "Vos vraies disponibilités, et deux clientes qui ne peuvent pas prendre la même heure.",
  },
  {
    title: "Des acomptes",
    body: "Réglés au moment de réserver, sur votre compte. La plateforme n'y touche pas.",
  },
  {
    title: "Vos chiffres",
    body: "Ce que vous avez encaissé, les prestations qui marchent, les clientes qui reviennent.",
  },
] as const;

/**
 * How it is used, from both sides.
 *
 * Her side and her client's side, because a visitor is deciding two things at
 * once: whether she can work it, and whether her clients will.
 */
const USE_HER = [
  "Vous réglez vos prestations, vos tarifs et vos horaires une fois.",
  "Vous publiez votre site. Il est en ligne à votre adresse.",
  "Vous ouvrez votre agenda le matin : les rendez-vous y sont déjà.",
] as const;

const USE_CLIENT = [
  "Elle ouvre votre lien, depuis une story ou votre statut WhatsApp.",
  "Elle choisit sa prestation et une heure réellement libre.",
  "Elle verse son acompte et reçoit sa confirmation.",
] as const;

/**
 * How to get an account. These are the real steps, not a funnel.
 *
 * There is no public sign-up. A platform administrator creates the space, the
 * password is mailed once and never stored in the clear, and the site stays
 * unpublished until she publishes it herself.
 */
const STEPS = [
  {
    title: "Vous nous écrivez",
    body: "Sur WhatsApp. Dites-nous votre métier et comment vous travaillez aujourd'hui.",
  },
  {
    title: "On crée votre espace",
    body: "Avec le nom de votre salon et la formule qui correspond à ce que vous faites.",
  },
  {
    title: "Vous recevez vos identifiants",
    body: "Par e-mail. Le mot de passe n'est enregistré nulle part en clair : changez-le à la première connexion.",
  },
  {
    title: "Vous préparez votre site",
    body: "Prestations, tarifs, horaires, photos. Prenez le temps, rien n'est visible encore.",
  },
  {
    title: "Vous le publiez",
    body: "Depuis Paramètres, quand vous êtes prête. C'est vous qui décidez du jour.",
  },
] as const;

/**
 * The offer itself lives in src/lib/plans/catalogue.ts, which the guard and
 * the administration screens read too: a price quoted to a prospect here and
 * the features actually granted after payment come from one table.
 */
const SHOWN_PLANS = PLAN_ORDER;

/** 48000 -> "48 000", with a narrow no-break space holding the groups together. */
function fcfa(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/[  \s]/g, " ");
}

export default async function BeautyPrestPage() {
  // Used only to show whether the installation has been set up yet.
  const providerCount = await prisma.provider
    .count({ where: { status: "ACTIVE" } })
    .catch(() => 0);

  return (
    <div className="mk">
      <MarketingHeader />

      <main>
        {/* --------------------------------------------------------- Cover */}
        {/* The logo carries the name and the baseline, so the heading is free
            to be the plain answer to "what is this". Every earlier version
            spent its headline on a promise and left the visitor guessing. */}
        <section className="mk-cover">
          <div className="container">
            <img
              className="mk-cover-logo"
              src="/logo-beautyprest.png"
              alt={`${PRODUCT.name}. ${PRODUCT.tagline}`}
              width={367}
              height={175}
              fetchPriority="high"
              decoding="async"
            />

            <h1 className="mk-cover-title">
              Le logiciel qui met votre salon en ligne et tient votre agenda.
            </h1>

            <div className="mk-cover-actions">
              <a href="#commencer" className="mk-btn">
                Comment commencer
              </a>
              <a href="#tarifs" className="mk-link">
                Voir les tarifs
              </a>
            </div>
          </div>
        </section>

        {/* ------------------------------------------- 1. Qu'est-ce que c'est */}
        <section id="produit" className="mk-q">
          <div className="container">
            <div className="mk-q-head">
              <p className="mk-kicker">01</p>
              <h2 className="mk-q-title">Qu&apos;est-ce que c&apos;est ?</h2>
              <p className="mk-q-lead">
                Un logiciel de réservation pour les métiers de la beauté.
                Il vous donne quatre choses, et il ne prend aucune commission
                sur vos rendez-vous.
              </p>
            </div>

            <ul className="mk-cards">
              {INCLUDED.map((item) => (
                <li key={item.title} className="mk-card">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------ 2. C'est pour qui */}
        <section id="pour-qui" className="mk-q mk-q-tint">
          <div className="container">
            <div className="mk-q-head">
              <p className="mk-kicker">02</p>
              <h2 className="mk-q-title">C&apos;est pour qui ?</h2>
              <p className="mk-q-lead">
                Pour une professionnelle de la beauté qui prend des
                rendez-vous, seule ou avec une équipe, en salon ou à domicile.
              </p>
            </div>

            <ul className="mk-trades">
              {TRADES.map((trade) => (
                <li key={trade.id}>{trade.label}</li>
              ))}
            </ul>

            {/* Saying who it is not for is the only part of a landing page a
                reader has no reason to disbelieve, so it buys the rest. */}
            <p className="mk-q-aside">
              Ce n&apos;est pas pour vous si vous travaillez sans rendez-vous,
              ou si votre carnet vous suffit. Un carnet qui tourne bien vaut
              mieux qu&apos;un abonnement dont on ne se sert pas, et il nous
              arrive de le dire.
            </p>
          </div>
        </section>

        {/* -------------------------------------------- 3. Comment ça marche */}
        <section id="utilisation" className="mk-q">
          <div className="container">
            <div className="mk-q-head">
              <p className="mk-kicker">03</p>
              <h2 className="mk-q-title">Comment ça s&apos;utilise ?</h2>
              <p className="mk-q-lead">
                Vous n&apos;installez rien. Tout se passe dans un navigateur,
                sur votre téléphone comme sur un ordinateur.
              </p>
            </div>

            <div className="mk-two-up">
              <div>
                <h3 className="mk-sub">De votre côté</h3>
                <ol className="mk-steps">
                  {USE_HER.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="mk-sub">Du côté de votre cliente</h3>
                <ol className="mk-steps">
                  {USE_CLIENT.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- 4. Quels tarifs */}
        <section id="tarifs" className="mk-q mk-q-tint">
          <div className="container">
            <div className="mk-q-head">
              <p className="mk-kicker">04</p>
              <h2 className="mk-q-title">Quels sont les tarifs ?</h2>
              <p className="mk-q-lead">
                Un abonnement, jamais une commission. Vos clientes vous paient
                directement. Réglez l&apos;année et profitez de{" "}
                <strong>deux mois offerts</strong>.
              </p>
            </div>

            <div className="mk-plans">
              {SHOWN_PLANS.map((plan) => (
                <PlanCard key={plan} plan={plan} />
              ))}
            </div>

            <div id="modules" className="mk-extras">
              <div className="mk-extras-head">
                <h3>Modules à la carte</h3>
                <p>À ajouter à n&apos;importe quelle formule.</p>
              </div>

              <ul className="mk-modules">
                {sellableFeatures().map((feature) => (
                  <li key={feature}>
                    <Link href={`/modules/${FEATURES[feature].slug}`}>
                      <span className="mk-modules-name">
                        {FEATURES[feature].label}
                        {requirementLabels(feature).length > 0 ? (
                          <small>
                            avec {requirementLabels(feature).join(" et ")}
                          </small>
                        ) : null}
                      </span>
                      <span className="mk-modules-price">
                        <b>{fcfa(moduleMonthly(feature))} F</b>
                        <small>
                          {fcfa(yearlyPrice(moduleMonthly(feature)))} F / an
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* The simulator answers the question the price list cannot: what
                it costs against what she actually makes. It sits inside the
                prices rather than in a section of its own, because on its own
                it was a second thing to decide about. */}
            <div id="demo" className="mk-sim">
              <h3 className="mk-sub">Ce que ça donne pour votre activité</h3>
              <DemoStudio
                plans={SHOWN_PLANS.map((plan) => ({
                  name: PLANS[plan].name,
                  monthly: PLANS[plan].monthly,
                }))}
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------- 5. Comment l'obtenir */}
        <section id="commencer" className="mk-q">
          <div className="container">
            <div className="mk-q-head">
              <p className="mk-kicker">05</p>
              <h2 className="mk-q-title">Comment l&apos;obtenir ?</h2>
              <p className="mk-q-lead">
                Il n&apos;y a pas d&apos;inscription en ligne : nous créons
                votre espace nous-mêmes, pour qu&apos;il soit juste dès le
                premier jour.
              </p>
            </div>

            <ol className="mk-path">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span aria-hidden="true">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ----------------------------------------------- 6. Qui contacter */}
        <section id="nous" className="mk-q mk-q-close">
          <div className="container">
            <div className="mk-q-head">
              <p className="mk-kicker">06</p>
              <h2 className="mk-q-title">Qui contacter ?</h2>
              <p className="mk-q-lead">
                Une petite équipe béninoise, à {CONTACT.city}. C&apos;est nous
                qui avons fait l&apos;outil, et c&apos;est nous qui répondons.
              </p>
            </div>

            <div className="mk-contact">
              <a
                href={CONTACT.whatsapp}
                className="mk-btn"
                target="_blank"
                rel="noreferrer noopener"
              >
                Écrire sur WhatsApp
              </a>
              <a
                href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                className="mk-contact-phone"
              >
                {CONTACT.phone}
              </a>
              <span className="mk-contact-where">
                {CONTACT.city}, {CONTACT.country}
              </span>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter
        note={
          providerCount > 0
            ? `${providerCount} prestataire${providerCount > 1 ? "s" : ""} en ligne`
            : undefined
        }
      />
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const definition = PLANS[plan];
  const monthly = definition.monthly;

  return (
    // The recommended plan carries a ring rather than a different background,
    // so all three stay equally readable.
    <div className="mk-plan" data-pick={definition.recommended ? "true" : undefined}>
      <div className="mk-plan-head">
        <span className="mk-plan-name">{definition.name}</span>
        {definition.recommended ? (
          <span className="mk-plan-tag">Recommandé</span>
        ) : null}
      </div>

      <p className="mk-plan-price">
        {fcfa(monthly)} F<small> / mois</small>
      </p>

      <div className="mk-plan-year">
        <p>
          ou <strong>{fcfa(yearlyPrice(monthly))} F</strong> par an
        </p>
        <p className="mk-plan-save">
          2 mois offerts, vous économisez{" "}
          {fcfa(monthly * 12 - yearlyPrice(monthly))} F
        </p>
      </div>

      <p className="mk-plan-pitch">{definition.pitch}</p>

      {definition.extends ? (
        <p className="mk-plan-extends">
          Tout {PLANS[definition.extends].name}, plus :
        </p>
      ) : null}

      <ul className="mk-list">
        {planHighlights(plan).map((feature) => (
          <li key={feature}>{feature}</li>
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
