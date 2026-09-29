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
import { DemoStudio } from "@/components/marketing/DemoStudio";
import { TradeRotator } from "@/components/marketing/TradeRotator";
import { ALSO_SERVED, TRADES } from "@/lib/marketing/trades";

export const dynamic = "force-dynamic";

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
const CONTACT_URL = "https://wa.me/22969668879";

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

export default async function HomePage() {
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
              Le métier est à vous.
              <br />
              <span className="mk-hero-rest">Le reste est à nous.</span>
            </h1>

            <p className="mk-hero-sub">
              Site de réservation, agenda, acomptes, caisse et chiffres — pour
              les <TradeRotator words={TRADES.map((trade) => trade.label)} />{" "}
              et tous les métiers de la beauté.
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

        {/* ------------------------------------------------------- Pour qui */}
        <section className="mk-trades">
          <div className="container">
            {/* A panel that sits on the page rather than a band cut through
                it. The dark slab this replaces carried the right words with
                the wrong manners: it stopped the page dead, and the trades it
                was meant to welcome read as a warning notice. */}
            <div className="mk-trades-panel">
              <h2 className="mk-trades-title">Pour qui ?</h2>
              <ul className="mk-trades-list">
                {TRADES.map((trade) => (
                  <li key={trade.id}>{trade.label}</li>
                ))}
                {ALSO_SERVED.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <p className="mk-trades-note">
                Si vous travaillez sur rendez-vous, la plateforme est faite
                pour vous. Le vocabulaire, les prestations et les durées sont
                les vôtres.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- Démo */}
        <section id="demo" className="mk-section mk-section-quiet">
          <div className="container">
            <div className="mk-head">
              <p className="mk-eyebrow">Voir la démo</p>
              <h2 className="mk-h2">Composez votre activité, maintenant.</h2>
              <p className="mk-lead">
                Choisissez votre métier, donnez un nom à votre activité, dites
                combien de rendez-vous vous faites par semaine. Vous verrez le
                site que vos clientes ouvriraient, et les chiffres que vous
                liriez de votre côté.
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

        {/* ------------------------------------------------ Qui sommes-nous */}
        <section id="nous" className="mk-about">
          <div className="container">
            <div className="mk-about-grid">
              <div>
                <p className="mk-eyebrow">Qui sommes-nous</p>
                <h2 className="mk-h2">
                  Une équipe béninoise, pour des métiers d&apos;ici.
                </h2>
              </div>

              <div className="mk-about-text">
                <p>
                  Prestataires est né à Porto-Novo, d&apos;un constat simple :
                  les outils de réservation existants sont écrits pour des
                  salons parisiens. Ils supposent une carte bancaire, une
                  connexion stable, une secrétaire à l&apos;accueil et des
                  prestations qui durent trente minutes. Ici, on prend un
                  acompte par Mobile Money, on répond sur WhatsApp entre deux
                  clientes, et une pose peut durer trois heures.
                </p>
                <p>
                  Nous construisons donc l&apos;inverse : un outil pensé pour
                  une professionnelle qui travaille seule ou à deux, qui tient
                  son agenda dans sa tête et ses comptes dans un cahier, et qui
                  n&apos;a ni le temps ni l&apos;envie d&apos;apprendre un
                  logiciel.
                </p>

                <ul className="mk-list">
                  <li>
                    <strong>Vous encaissez, pas nous.</strong> Les paiements de
                    vos clientes vont sur votre compte. Nous ne prenons aucune
                    commission sur vos rendez-vous — seulement un abonnement, et
                    vous savez toujours combien.
                  </li>
                  <li>
                    <strong>Vos données sont les vôtres.</strong> Votre fichier
                    clientes ne sert à personne d&apos;autre. Nous ne le
                    revendons pas et nous n&apos;en faisons pas un annuaire.
                  </li>
                  <li>
                    <strong>On répond.</strong> En français, sur WhatsApp, par
                    des gens qui connaissent le métier.
                  </li>
                </ul>

                {CONTACT_URL ? (
                  <a href={CONTACT_URL} className="mk-btn mk-btn-ghost">
                    Parler à quelqu&apos;un
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mk-foot">
        <div className="container">
          <div className="mk-foot-top">
            <div>
              <p className="mk-foot-name">Prestataires</p>
              <p className="mk-foot-lead">
                Le business derrière la beauté : rendez-vous, acomptes, clientes
                et chiffres, dans un seul espace.
              </p>
            </div>

            <div className="mk-foot-cols">
              <section>
                <h2>Plateforme</h2>
                <ul>
                  <li>
                    <a href="#demo">Voir la démo</a>
                  </li>
                  <li>
                    <a href="#tarifs">Tarifs</a>
                  </li>
                  <li>
                    <a href="#modules">Modules</a>
                  </li>
                  <li>
                    <Link href="/login">Espace prestataire</Link>
                  </li>
                </ul>
              </section>

              <section>
                <h2>À propos</h2>
                <ul>
                  <li>
                    <a href="#nous">Qui sommes-nous</a>
                  </li>
                  <li>
                    <a href={CONTACT_URL} target="_blank" rel="noreferrer noopener">
                      WhatsApp
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </div>

          <div className="mk-foot-bottom">
            <span>© {new Date().getFullYear()} Prestataires — Porto-Novo, Bénin</span>
            <span>
              {providerCount > 0
                ? `${providerCount} prestataire${providerCount > 1 ? "s" : ""} en ligne`
                : "Plateforme prête"}
            </span>
          </div>
        </div>
      </footer>
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

