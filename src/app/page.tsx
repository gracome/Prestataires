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
import { photo } from "@/lib/marketing/imagery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${PRODUCT.name}, votre business mérite d'être beau`,
  description:
    "Un site de réservation à votre nom, un agenda qui ne se trompe pas et des acomptes encaissés. Sans commission sur vos rendez-vous.",
};

/**
 * Platform landing page.
 *
 * This is the fourth arrangement, and the first one built to a brief rather
 * than to a theory. The three before it were, in order: a tour of the features;
 * an argument against the directories; and a structural rebuild with a split
 * hero, a sticky column and two carousels of drawn mock screens. Each was
 * tighter than the last and all three were wrong in the same way, which took
 * being told plainly to see.
 *
 * They were pages about software. This is a trade where the work is looked at
 * before it is described, and a page that sells it with numbered paragraphs and
 * wireframes is arguing in the wrong language however good the argument is.
 *
 * So: photographs, large, and few words beside them. One statement to a
 * section. The drawn product mock-ups are gone, and so is the gallery of five
 * template palettes, which put five colour schemes on a page already carrying
 * its own and made the whole thing shout.
 *
 * Two constraints the pictures have to respect.
 *
 * They must not photograph one trade. The very first version of this page was
 * shot entirely in a nail salon, which quietly told every hairdresser and
 * barber that the product was not for them. So the five pictures here are hair,
 * make-up, a treatment room, a manicurist's hands and a finished manicure:
 * four trades, none of them presented as the trade, and no photograph used
 * twice.
 *
 * And they are the wrong photographs, which is worth stating rather than
 * hiding. Seven of the eight in the library show pale hands and pale skin. The
 * two used here that include a person were chosen partly for not doing that,
 * but a page for salons in Porto-Novo should be photographed in Porto-Novo.
 *
 * It deliberately does not list the providers on the platform: their client
 * lists are not a directory.
 */

/**
 * The three moments, each one a picture and a sentence.
 *
 * Four before, and the fourth, the figures at the end of the month, was the
 * weakest thing to look at: a dashboard is the one part of this product that
 * cannot be photographed. It is still sold, in the plans below, where a reader
 * is already reading rather than looking.
 *
 * The text is deliberately shorter than it wants to be. Every one of these was
 * a paragraph in the previous version.
 */
const MOMENTS = [
  {
    key: "adresse",
    eyebrow: "Votre adresse",
    title: "Un lien à envoyer, pas un numéro à donner.",
    body: "Vos prestations, vos tarifs, vos photos. Votre cliente ouvre le lien à minuit et réserve seule.",
    image: photo("portrait", 1100),
    alt: "Palettes de fards, pinceaux et flacons posés sur un plan clair",
  },
  {
    key: "agenda",
    eyebrow: "Votre agenda",
    title: "Deux clientes ne peuvent pas prendre la même heure.",
    body: "Elle ne voit que vos vraies disponibilités. Le double rendez-vous n'est pas vérifié, il est impossible.",
    image: photo("care", 1100),
    alt: "Une esthéticienne applique un masque à une cliente allongée",
  },
  {
    key: "acompte",
    eyebrow: "Vos acomptes",
    title: "La journée commence avec de la caisse.",
    body: "Elle règle une partie en réservant, sur votre compte. Celles qui ne viennent pas deviennent rares.",
    image: photo("detail", 1100),
    alt: "Les mains d'une prothésiste ongulaire au travail",
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
    // data-cover tells the sticky header to go light and transparent until the
    // visitor has scrolled past the photograph, so it is never cream on top of
    // an image.
    <div className="mk" data-cover="true">
      <MarketingHeader />

      <main>
        {/* --------------------------------------------------------- Cover */}
        {/* The baseline is the headline. Every previous version opened on
            "Logiciel de gestion" or "Passez du cahier à l'entreprise", which
            is what the product is; this opens on what it is for. The category
            is still said, once, in small type above it, because a visitor who
            does not know what she is looking at should not have to guess. */}
        <section className="mk-cover">
          <img
            className="mk-cover-photo"
            src={photo("salon", 1800)}
            alt=""
            // The one image on the page worth blocking the first paint for.
            fetchPriority="high"
            decoding="async"
          />

          <div className="mk-cover-inner container">
            <p className="mk-eyebrow">Réservation en ligne, {CONTACT.city}</p>
            <h1 className="mk-cover-title">{PRODUCT.tagline}</h1>
            <p className="mk-cover-sub">
              Un site de réservation à votre nom. Le nôtre n&apos;apparaît nulle
              part dessus.
            </p>
            <div className="mk-cover-actions">
              <Link href="/demo" className="mk-btn">
                Voir une démonstration
              </Link>
              <a href="#tarifs" className="mk-btn mk-btn-quiet">
                Les tarifs
              </a>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- Terms */}
        {/* Three figures on one quiet line, directly under the cover. They are
            the whole commercial argument and they take eleven words. */}
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
        {/* Picture and sentence, alternating sides. Nothing else. The reasoning
            that used to sit in four numbered paragraphs is in the comments on
            MOMENTS, where it belongs: a prospect does not need to be walked
            through an argument she can see. */}
        <section className="mk-moments">
          {MOMENTS.map((moment, index) => (
            <article
              key={moment.key}
              className="mk-moment"
              // Even rows put the picture on the right. Done with an attribute
              // rather than :nth-child so the order can change without the
              // rhythm breaking.
              data-side={index % 2 === 0 ? "left" : "right"}
            >
              <div className="mk-moment-photo">
                <img src={moment.image} alt={moment.alt} loading="lazy" decoding="async" />
              </div>

              <div className="mk-moment-copy">
                <p className="mk-eyebrow">{moment.eyebrow}</p>
                <h2>{moment.title}</h2>
                <p>{moment.body}</p>
              </div>
            </article>
          ))}
        </section>

        {/* ------------------------------------------------------ Statement */}
        {/* One sentence, alone, large, on cream. The page needs a place to
            breathe between the photographs and the prices, and the thing worth
            saying there is the one a directory cannot say. */}
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
              <p className="mk-eyebrow">Voir la démo</p>
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
              <p className="mk-eyebrow">Nos formules</p>
              <h2 className="mk-h2">
                Un abonnement, jamais une commission.
              </h2>
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
        {/* Two sentences and a photograph. It was a statement, a lead, three
            numbered promises and an aside; the promises are all said elsewhere
            on the page, by the terms line and the claim. */}
        <section id="nous" className="mk-closing">
          <div className="container">
            <div className="mk-closing-grid">
              <div className="mk-closing-copy">
                <p className="mk-eyebrow">Qui sommes-nous</p>
                <h2>
                  Écrit à {CONTACT.city}, pour des salons d&apos;ici.
                </h2>
                <p>
                  Une petite équipe béninoise, qui a construit cet outil avec
                  des professionnelles de la beauté. Il nous arrive de dire à
                  quelqu&apos;un que ce n&apos;est pas pour elle.
                </p>
                <a href={CONTACT.whatsapp} className="mk-btn">
                  Parler à quelqu&apos;un
                </a>
              </div>

              <div className="mk-closing-photo">
                <img
                  src={photo("nails", 900)}
                  alt="Des mains aux ongles nude, posées sur une fourrure blanche"
                  loading="lazy"
                  decoding="async"
                />
              </div>
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
