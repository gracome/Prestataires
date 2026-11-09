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
import { TradeRotator } from "@/components/marketing/TradeRotator";
import { TRADES } from "@/lib/marketing/trades";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${PRODUCT.name} — passez du cahier à l'entreprise`,
  description:
    "Un site de réservation à votre nom, un agenda qui ne se trompe pas, des acomptes encaissés et vos chiffres au même endroit. Sans commission sur vos rendez-vous.",
};

/**
 * Platform landing page.
 *
 * Three rules govern what follows, and all three were learned the hard way.
 *
 * First: it wears the .mk skin, never the site-* one. A provider's site is
 * photographic, curved and hers; this page is typographic and ours. When the
 * two looked alike, the product looked like a template rather than something
 * she owns.
 *
 * Second: it names no single trade. It used to be photographed entirely in a
 * nail salon, which told every hairdresser and barber that the product was not
 * for them. There is no neutral photograph of a beauty business, so there are
 * no photographs here at all: the page lets the visitor pick her trade, and the
 * demo answers in her own vocabulary.
 *
 * Third, and the reason this page was rewritten: it makes one argument, not
 * seven. It used to open by arguing against the directories, then tour the
 * features, then list the modules, then introduce the team — four separate
 * pitches that each weakened the others, on a flat cream page that gave the eye
 * nothing to hold. What a provider is actually being offered is a step up: she
 * arrives with a notebook and a phone, and leaves with a business that has an
 * address, an agenda, a till and figures. Everything here serves that one
 * sentence, and anything that did not is gone.
 *
 * It deliberately does not list the providers on the platform: their client
 * lists are not a directory.
 */

/** Where "sur mesure" enquiries go. Empty, the button disappears. */
const CONTACT_URL = CONTACT.whatsapp;

/**
 * The step up, in four lines: the notebook on the left, the business on the
 * right.
 *
 * This replaced both the feature tour and the argument against the directories.
 * A feature list says what the software has; this says what changes on Monday,
 * which is the only thing being bought. Each "avant" is a sentence a provider
 * has actually said out loud — that is the test, not whether it reads well.
 */
const SHIFTS = [
  {
    before: "« Donne-moi ton numéro, je te rappelle pour l'heure. »",
    after: "Une adresse à vous",
    body: "Vos prestations, vos tarifs, vos photos. Un lien à envoyer en story, que votre cliente ouvre à minuit et réserve seule.",
  },
  {
    before: "Deux clientes notées sur le même créneau, découvert le matin même.",
    after: "Un agenda qui refuse",
    body: "Elle ne voit que vos vraies disponibilités. Deux personnes ne peuvent pas prendre le même créneau : ce n'est pas une vérification, c'est impossible.",
  },
  {
    before: "« Elle n'est pas venue. » Et la matinée est perdue.",
    after: "Un acompte déjà versé",
    body: "Elle règle une partie en réservant, sur votre compte. Celles qui ne viennent pas deviennent rares, et la journée commence avec de la caisse.",
  },
  {
    before: "Le chiffre du mois, on le devine à la fin.",
    after: "Vos chiffres, écrits",
    body: "Ce que vous avez encaissé, les prestations qui marchent, les clientes qui reviennent. Lisible en trente secondes le lundi matin.",
  },
] as const;

/**
 * What the product promises.
 *
 * Three, not four: each one is a thing a provider can hold us to and a thing a
 * directory would hesitate to write down — which is the test a promise has to
 * pass before it earns space here. Anything true of any booking app in the
 * world ("simple", "rapide") is not here, and the fourth promise — that we
 * answer — was cut because the button underneath is the promise.
 */
const PROMISES = [
  {
    title: "Un abonnement, pas une commission",
    body: "Un montant connu chaque mois. Nous ne prenons rien au passage sur vos rendez-vous, quel que soit le nombre que vous en faites.",
  },
  {
    title: "Votre nom, pas le nôtre",
    body: "Vos clientes réservent sur votre site, à vos couleurs. Elles retiennent le nom de votre salon, parce que c'est celui qui est écrit en grand.",
  },
  {
    title: "Vos clientes sont à vous",
    body: "Votre fichier n'est pas un annuaire où l'on va proposer le salon d'à côté. Personne d'autre que vous ne leur écrit, et vous pouvez partir avec.",
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
    // data-hero="dark" tells the sticky header to go light-on-dark until the
    // visitor scrolls past the hero, so the nav never floats cream on plum.
    <div className="mk" data-hero="dark">
      <MarketingHeader />

      <main>
        {/* ---------------------------------------------------------- Hero */}
        {/* Dark, because the page used to open cream on cream and gave the eye
            nothing to hold: a prospect met a wall of warm beige and a
            paragraph. The plum is the brand's own, the rose glow is the only
            ornament, and the cream that follows now reads as a relief rather
            than as the whole page. */}
        <section className="mk-hero mk-hero-dark">
          <div className="container">
            <p className="mk-eyebrow">Logiciel de gestion — Bénin</p>

            <h1 className="mk-hero-title">
              Passez du cahier
              <br />
              <span className="mk-hero-rest">à l&apos;entreprise.</span>
            </h1>

            <p className="mk-hero-baseline">{PRODUCT.tagline}</p>

            <p className="mk-hero-sub">
              Un site de réservation à votre nom, un agenda, des acomptes et vos
              chiffres — pour les{" "}
              <TradeRotator words={TRADES.map((trade) => trade.label)} /> et tous
              les métiers de la beauté.
            </p>

            <div className="mk-hero-actions">
              <a href="#demo" className="mk-btn">
                Simuler mon activité
              </a>
              <a href="#tarifs" className="mk-btn mk-btn-ghost">
                Voir les tarifs
              </a>
            </div>

            <dl className="mk-hero-facts">
              <div>
                <dt>Commission sur vos rendez-vous</dt>
                <dd>0 %</dd>
              </div>
              <div>
                <dt>Vos clientes vous paient</dt>
                <dd>directement</dd>
              </div>
              <div>
                <dt>À partir de</dt>
                <dd>{fcfa(PLANS[SHOWN_PLANS[0]].monthly)} F / mois</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* -------------------------------------------------- Avant / après */}
        <section className="mk-section mk-shifts-section">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Ce qui change</p>
              <h2 className="mk-h2">
                Le métier ne change pas. La maison autour, si.
              </h2>
            </div>

            <ol className="mk-shifts">
              {SHIFTS.map((shift, index) => (
                <li key={shift.after} className="mk-shift">
                  <span aria-hidden="true" className="mk-shift-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <p className="mk-shift-before">{shift.before}</p>

                  <div className="mk-shift-after">
                    <h3>{shift.after}</h3>
                    <p>{shift.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- Démo */}
        <section id="demo" className="mk-section mk-section-quiet">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Voir la démo</p>
              <h2 className="mk-h2">Composez votre activité, maintenant.</h2>
              <p className="mk-lead">
                Votre métier, votre rythme, vos tarifs. Vous verrez à quoi votre
                mois ressemble, et ce que la plateforme coûte en face.
              </p>
            </div>

            <DemoStudio
              plans={SHOWN_PLANS.map((plan) => ({
                name: PLANS[plan].name,
                monthly: PLANS[plan].monthly,
              }))}
            />
          </div>
        </section>

        {/* --------------------------------------------------------- Tarifs */}
        {/* The modules used to have a section of their own, with its own
            heading, lead and call to action. They are an addendum to the
            offer, not a second offer, so they sit inside it now. */}
        <section id="tarifs" className="mk-section">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Nos formules</p>
              <h2 className="mk-h2">
                Un abonnement simple, sans commission sur vos rendez-vous.
              </h2>
              <p className="mk-lead">
                Vos clientes vous paient directement, sur votre propre compte.
                Payez au mois, ou réglez l&apos;année et profitez de{" "}
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
                <p>
                  À ajouter à n&apos;importe quelle formule. Chacun a sa page :
                  ce qu&apos;il change pour vous, ce qu&apos;il change pour vos
                  clientes.
                </p>
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

              {CONTACT_URL ? (
                <p className="mk-extras-foot">
                  Besoin d&apos;une configuration particulière ?{" "}
                  <a href={CONTACT_URL}>Écrivez-nous</a>, nous composons à
                  partir de vos besoins réels.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- Qui sommes-nous */}
        {/* Dark again, to close the page the way it opened, and because what
            is said here is the part a provider is asked to take on trust. */}
        <section id="nous" className="mk-about mk-about-dark">
          <div className="container">
            <div className="mk-about-head">
              <p className="mk-eyebrow">Qui sommes-nous</p>
              <h2 className="mk-statement">
                Un logiciel écrit à {CONTACT.city}, pour des salons d&apos;ici
                — <span>pas traduit d&apos;ailleurs.</span>
              </h2>
              <p className="mk-about-lead">
                Une petite équipe béninoise. Nous avons construit cet outil avec
                des professionnelles de la beauté, en regardant comment elles
                travaillent vraiment : un téléphone, une connexion qui coupe,
                des acomptes par Mobile Money et un cahier qui ne suffit plus.
              </p>
            </div>

            <ul className="mk-principles">
              {PROMISES.map((promise, index) => (
                <li key={promise.title}>
                  <span aria-hidden="true" className="mk-principle-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{promise.title}</h3>
                  <p>{promise.body}</p>
                </li>
              ))}
            </ul>

            {/* No button here. The footer's invitation sits a screen below
                and says the same thing in the same words, and two WhatsApp
                buttons in a row read as a page that is not sure it was
                heard. */}
            <div className="mk-about-foot">
              <p>
                Il nous arrive de dire à quelqu&apos;un que ce n&apos;est pas
                pour elle. Un carnet qui tourne bien vaut mieux qu&apos;un
                abonnement dont on ne se sert pas.
              </p>
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
          2 mois offerts — vous économisez{" "}
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
