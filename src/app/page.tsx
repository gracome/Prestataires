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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${PRODUCT.name}, votre business mérite d'être beau`,
  description:
    "Un site de réservation à votre nom, un agenda qui ne se trompe pas et des acomptes encaissés. Sans commission sur vos rendez-vous.",
};

/**
 * Platform landing page.
 *
 * Fifth arrangement. The four before it: a tour of the features; an argument
 * against the directories; a structural rebuild with a split hero, a sticky
 * column and two carousels of drawn mock screens; and a photographic one.
 *
 * What survived each round is worth writing down, because it is the brief.
 *
 * Not a page about software. This is a trade where the work is looked at
 * before it is described, so numbered paragraphs and wireframes argue in the
 * wrong language however good the argument is. The drawn mock-ups and the
 * gallery of five template palettes are gone for good: the gallery put five
 * colour schemes on a page already carrying its own, and made the whole thing
 * shout.
 *
 * And no photographs either. The library is eight Unsplash stand-ins, seven of
 * which show pale hands and pale skin, which is not what a salon in Porto-Novo
 * looks like. A borrowed photograph of somebody else's client is worse than no
 * photograph: it is the one thing on the page a visitor can tell is not real.
 *
 * Which leaves type, and the discipline that goes with it. A typographic page
 * is bland when it is set small and crowded, which is what the earlier ones
 * were: five sections of eyebrow, heading, paragraph, card grid, all at the
 * same size in the same column. The remedy is not ornament. It is scale and
 * air: one statement to a screen, set large enough to be worth stopping for,
 * with enough space around it that nothing competes. Three colours, cream,
 * plum and one rose, and nothing else borrowed.
 *
 * It deliberately does not list the providers on the platform: their client
 * lists are not a directory.
 */

/**
 * The three moments, each one a sentence.
 *
 * Four before, and the fourth, the figures at the end of the month, was cut:
 * it is the one part of this product a visitor cannot picture, and it is
 * already sold by the plans below, where she is reading rather than looking.
 *
 * The body text is deliberately shorter than it wants to be. Every one of
 * these was a full paragraph two versions ago.
 */
const MOMENTS = [
  {
    key: "adresse",
    index: "I",
    eyebrow: "Votre adresse",
    title: "Un lien à envoyer, pas un numéro à donner.",
    body: "Vos prestations, vos tarifs, vos photos. Votre cliente ouvre le lien à minuit et réserve seule.",
  },
  {
    key: "agenda",
    index: "II",
    eyebrow: "Votre agenda",
    title: "Deux clientes ne peuvent pas prendre la même heure.",
    body: "Elle ne voit que vos vraies disponibilités. Le double rendez-vous n'est pas vérifié, il est impossible.",
  },
  {
    key: "acompte",
    index: "III",
    eyebrow: "Vos acomptes",
    title: "La journée commence avec de la caisse.",
    body: "Elle règle une partie en réservant, sur votre compte. Celles qui ne viennent pas deviennent rares.",
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
        {/* Nearly a whole screen for one sentence. The baseline is the
            headline: every earlier version opened on "Logiciel de gestion" or
            "Passez du cahier à l'entreprise", which is what the product is.
            This opens on what it is for, and says the category once, small,
            above it, so a visitor who does not know what she is looking at
            does not have to guess. */}
        <section className="mk-cover">
          <div className="container">
            <p className="mk-kicker">Réservation en ligne, {CONTACT.city}</p>

            <h1 className="mk-cover-title">{PRODUCT.tagline}</h1>

            <p className="mk-cover-sub">
              Un site de réservation à votre nom. Le nôtre n&apos;apparaît
              nulle part dessus.
            </p>

            <div className="mk-cover-actions">
              <Link href="/demo" className="mk-btn">
                Voir une démonstration
              </Link>
              <a href="#tarifs" className="mk-link">
                Les tarifs
              </a>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- Terms */}
        {/* Three figures on one quiet line. They are the whole commercial
            argument and they take eleven words, so they get a rule rather
            than a section of their own. */}
        <section className="mk-terms">
          <div className="container">
            <dl>
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

        {/* ------------------------------------------------------- Moments */}
        {/* One statement to a screen, three times, each with a great deal of
            room around it. The numeral is set in roman because a decorative
            number is the only ornament this page allows itself, and roman
            numerals read as a chapter rather than as a step in a tutorial. */}
        <section className="mk-moments">
          {MOMENTS.map((moment) => (
            <article key={moment.key} className="mk-moment">
              <div className="container">
                <span aria-hidden="true" className="mk-moment-numeral">
                  {moment.index}
                </span>
                <p className="mk-kicker">{moment.eyebrow}</p>
                <h2 className="mk-moment-title">{moment.title}</h2>
                <p className="mk-moment-body">{moment.body}</p>
              </div>
            </article>
          ))}
        </section>

        {/* ------------------------------------------------------ Statement */}
        {/* One sentence, alone, as large as the cover. The page needs a place
            to breathe before the prices, and the thing worth saying there is
            the one a directory cannot say. */}
        <section className="mk-claim">
          <div className="container">
            <p className="mk-claim-text">
              Vos clientes retiennent le nom de votre salon, parce que
              c&apos;est le seul qui soit écrit.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- Démo */}
        {/* White, like the prices below it: the studio's panels and the plan
            cards are both drawn in cream, and a cream card on a cream band is
            a card nobody can see. */}
        <section id="demo" className="mk-section mk-section-quiet">
          <div className="container">
            <div className="mk-head">
              <p className="mk-kicker">Voir la démo</p>
              <h2 className="mk-h2">Composez votre activité.</h2>
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
        <section id="tarifs" className="mk-section mk-section-quiet">
          <div className="container">
            <div className="mk-head">
              <p className="mk-kicker">Nos formules</p>
              <h2 className="mk-h2">Un abonnement, jamais une commission.</h2>
              <p className="mk-lead">
                Réglez l&apos;année et profitez de{" "}
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
          </div>
        </section>

        {/* -------------------------------------------------- Qui sommes-nous */}
        {/* Two sentences. It was a statement, a lead, three numbered promises
            and an aside; the promises are all said earlier by the terms line
            and the claim, and saying them twice was the page insisting. */}
        <section id="nous" className="mk-closing">
          <div className="container">
            <p className="mk-kicker">Qui sommes-nous</p>
            <h2 className="mk-closing-title">
              Écrit à {CONTACT.city}, pour des salons d&apos;ici.
            </h2>
            <p className="mk-closing-body">
              Une petite équipe béninoise, qui a construit cet outil avec des
              professionnelles de la beauté. Il nous arrive de dire à
              quelqu&apos;un que ce n&apos;est pas pour elle.
            </p>
            <a href={CONTACT.whatsapp} className="mk-btn">
              Parler à quelqu&apos;un
            </a>
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
