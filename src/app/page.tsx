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
  title: `${PRODUCT.name} — la plateforme de réservation des métiers de la beauté`,
  description:
    "Un site de réservation à votre nom, un agenda qui ne se trompe pas, des acomptes encaissés et vos chiffres au même endroit. Sans commission sur vos rendez-vous.",
};

/**
 * Platform landing page.
 *
 * Two rules govern what follows, and both were learned the hard way.
 *
 * First: it wears the .mk skin, never the site-* one. A provider's site is
 * photographic, curved and hers; this page is flat, typographic and ours. When
 * the two looked alike, the product looked like a template rather than
 * something she owns.
 *
 * Second: it names no single trade. It used to be photographed entirely in a
 * nail salon, which told every hairdresser and barber that the product was not
 * for them. There is no neutral photograph of a beauty business, so there are
 * no photographs here at all: the page lets the visitor pick her trade, and the
 * demo answers in her own vocabulary.
 *
 * It deliberately does not list the providers on the platform: their client
 * lists are not a directory.
 */

/**
 * Where "sur mesure" enquiries go. Left empty the button disappears rather
 * than pointing nowhere.
 */
const CONTACT_URL = CONTACT.whatsapp;

/**
 * What the product promises, in four lines.
 *
 * Each one is a thing a provider can hold us to and a thing a directory would
 * hesitate to write down — which is the test a promise has to pass before it
 * earns space on the landing page. Anything that would be true of any booking
 * app in the world ("simple", "rapide") is not here.
 */
const PROMISES = [
  {
    title: "Un abonnement, pas une commission",
    body: "Vous payez un montant connu chaque mois. Nous ne prenons rien au passage sur vos rendez-vous, quel que soit le nombre que vous en faites.",
  },
  {
    title: "Votre nom, pas le nôtre",
    body: "Vos clientes réservent sur votre site, à vos couleurs. Elles retiennent le nom de votre salon, parce que c'est celui qui est écrit en grand.",
  },
  {
    title: "Vos clientes sont à vous",
    body: "Votre fichier n'est pas un annuaire où l'on va proposer le salon d'à côté. Personne d'autre que vous ne leur écrit.",
  },
  {
    title: "On répond",
    body: "En français, sur WhatsApp, par les gens qui ont fait l'outil — pas par un formulaire.",
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
        {/* ---------------------------------------------------------- Hero */}
        <section className="mk-hero">
          <div className="container">
            <p className="mk-eyebrow">Logiciel de gestion — Bénin</p>

            <h1 className="mk-hero-title">
              Votre site.
              <br />
              <span className="mk-hero-rest">Votre nom dessus.</span>
            </h1>

            <p className="mk-hero-baseline">{PRODUCT.tagline}</p>

            <p className="mk-hero-sub">
              Site de réservation, agenda, acomptes, caisse et chiffres — pour
              les <TradeRotator words={TRADES.map((trade) => trade.label)} />{" "}
              et tous les métiers de la beauté. Vos clientes retiennent votre
              nom, pas le nôtre.
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

        {/* -------------------------------------------------- Annuaire ou site */}
        {/* The argument that decides against the directories, made without
            naming one. Naming a competitor advertises it, dates the page, and
            starts a fight on ground we do not control; describing the pattern
            lands the same blow and still reads true in two years.

            It leads the page because it is the one difference a provider
            cannot undo later: everything else is a feature she could be sold
            elsewhere, but the name her clients remember is decided the day she
            chooses where her page lives. */}
        <section className="mk-versus">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">La différence qui compte</p>
              <h2 className="mk-h2">
                Une fiche dans un annuaire, ou un site à vous.
              </h2>
              <p className="mk-lead">
                Beaucoup de plateformes vous donnent une page à leur nom, dans
                leur catalogue, à côté de vos concurrentes. Vos clientes
                repartent en ayant retenu la marque de la plateforme — pas la
                vôtre.
              </p>
            </div>

            <div className="mk-versus-grid">
              <article className="mk-versus-them">
                <h3>Sur un annuaire</h3>
                <ul>
                  <li>
                    Votre nom en petit, sous le leur. Une cliente peut repartir
                    sans l&apos;avoir retenu.
                  </li>
                  <li>
                    Vous êtes affichée à côté de vos concurrentes, et la
                    visibilité se paie.
                  </li>
                  <li>
                    La même page que toutes les autres, aux mêmes couleurs.
                  </li>
                  <li>
                    Le jour où vous partez, vos clientes ne savent pas où vous
                    retrouver.
                  </li>
                </ul>
              </article>

              <article className="mk-versus-us">
                <h3>Avec {PRODUCT.name}</h3>
                <ul>
                  <li>
                    Votre nom, vos couleurs, vos photos. Le nôtre
                    n&apos;apparaît pas.
                  </li>
                  <li>
                    Votre propre adresse à envoyer en story. Personne
                    d&apos;autre dessus.
                  </li>
                  <li>
                    Aucune concurrente sur votre page. Il n&apos;y a pas de
                    catalogue.
                  </li>
                  <li>
                    Votre fichier clientes est à vous. Vous pouvez partir avec.
                  </li>
                </ul>
              </article>
            </div>

            <p className="mk-versus-note">
              C&apos;est la seule différence sur laquelle vous ne pourrez pas
              revenir plus tard : tout le reste se rattrape, mais le nom que
              vos clientes retiennent se décide le jour où vous choisissez où
              votre page est hébergée.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- Démo */}
        <section id="demo" className="mk-section mk-section-quiet">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Voir la démo</p>
              <h2 className="mk-h2">Composez votre activité, maintenant.</h2>
              <p className="mk-lead">
                Votre métier, votre rythme, vos tarifs. Vous verrez à quoi
                votre mois ressemble, et ce que la plateforme coûte en face.
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

        {/* -------------------------------------------------- Capabilities */}
        {/* The product tour used to sit here. Once the demo above let a
            visitor compose her own site and read her own figures, a mock of
            somebody else's was both weaker and second: it showed a screen she
            had already seen a truer version of. */}
        <section className="mk-section">
          <div className="container">
            <h2 className="mk-h2 mk-h2-wide">
              Tout ce qu&apos;il faut pour faire tourner votre activité.
            </h2>

            <div className="mk-caps">
              {CAPABILITIES.map((capability, index) => (
                <article key={capability.title} className="mk-cap">
                  <span aria-hidden="true" className="mk-cap-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{capability.title}</h3>
                  <p>{capability.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- Tarifs */}
        <section id="tarifs" className="mk-section mk-section-quiet">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Nos formules</p>
              <h2 className="mk-h2">
                Un abonnement simple, sans commission sur vos rendez-vous.
              </h2>
              <p className="mk-lead">
                Vos clientes vous paient directement, sur votre propre compte :
                nous ne prenons rien au passage. Payez au mois, ou réglez
                l&apos;année et profitez de <strong>deux mois offerts</strong>.
              </p>
            </div>

            <div className="mk-plans">
              {SHOWN_PLANS.map((plan) => (
                <PlanCard key={plan} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- Modules */}
        <section id="modules" className="mk-section">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Modules à la carte</p>
              <h2 className="mk-h2">
                Vous n&apos;avez besoin que de certaines fonctionnalités ?
              </h2>
              <p className="mk-lead">
                Ajoutez un module à n&apos;importe quelle formule. Chacun a sa
                page : ce qu&apos;il change pour vous, ce qu&apos;il change pour
                vos clientes, et ce qu&apos;il vous faut pour l&apos;utiliser.
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

            <div className="mk-callout">
              <h3>Besoin d&apos;une configuration particulière ?</h3>
              <p>
                Nous composons votre solution sur mesure à partir de vos besoins
                réels.
              </p>
              {CONTACT_URL ? (
                <a href={CONTACT_URL} className="mk-btn">
                  Nous contacter
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- Qui sommes-nous */}
        <section id="nous" className="mk-about">
          <div className="container">
            <div className="mk-about-head">
              <p className="mk-eyebrow">Qui sommes-nous</p>
              <h2 className="mk-statement">
                Un logiciel écrit à {CONTACT.city}, pour des salons d&apos;ici
                — <span>pas traduit d&apos;ailleurs.</span>
              </h2>
              <p className="mk-about-lead">
                Nous sommes une petite équipe béninoise. Nous avons construit
                cet outil avec des professionnelles de la beauté, en regardant
                comment elles travaillent vraiment : un téléphone, une
                connexion qui coupe, des acomptes par Mobile Money et un cahier
                qui ne suffit plus.
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

            <div className="mk-about-foot">
              <p>
                Il nous arrive de dire à quelqu&apos;un que ce n&apos;est pas
                pour elle. Un carnet qui tourne bien vaut mieux qu&apos;un
                abonnement dont on ne se sert pas.
              </p>
              <a href={CONTACT.whatsapp} className="mk-btn">
                Parler à quelqu&apos;un →
              </a>
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

/**
 * The four things the product does, said without a photograph.
 *
 * Every picture we could put here would be of one trade, and would exclude the
 * other five. Numbered text excludes nobody.
 */
const CAPABILITIES = [
  {
    title: "Votre propre site",
    body: "Un site à votre image, avec vos photos, vos prestations et vos tarifs. Une adresse à vous, à envoyer en story plutôt qu'un numéro de téléphone.",
  },
  {
    title: "Un agenda qui ne se trompe pas",
    body: "Vos clientes voient vos vraies disponibilités, celles que vous avez définies. Deux personnes ne peuvent pas réserver le même créneau : la base de données le refuse.",
  },
  {
    title: "Des acomptes encaissés",
    body: "Elle verse son acompte au moment de réserver, sur votre compte. Moins d'annulations la veille, et une caisse qui commence la journée pleine.",
  },
  {
    title: "Vos chiffres, sans cahier",
    body: "Ce que vous avez encaissé, vos prestations qui marchent, vos clientes qui reviennent. Lisible en trente secondes le lundi matin.",
  },
] as const;

