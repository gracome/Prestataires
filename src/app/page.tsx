import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  FEATURES,
  PLANS,
  PLAN_ORDER,
  planHighlights,
  expandRequirements,
  sellableFeatures,
  yearlyPrice,
} from "@/lib/plans/catalogue";
import type { Plan, PlanFeature } from "@prisma/client";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { SignupForm } from "@/components/marketing/SignupForm";
import { CONTACT, PRODUCT } from "@/lib/marketing/product";
import { TRADES, humanDuration } from "@/lib/marketing/trades";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${PRODUCT.name}, le logiciel de réservation des métiers de la beauté`,
  description:
    "Un site de réservation à votre nom, un agenda qui ne se trompe pas et des acomptes encaissés. Sans commission sur vos rendez-vous.",
};

/**
 * Platform landing page.
 *
 * Built as a platform page and not as a text. Every band is a short title
 * ending in a full stop, at most one line under it, and then the thing
 * itself drawn at full fidelity. There is no paragraph on this page: where an
 * explanation was wanted, the screen it describes is shown instead.
 *
 * That is the correction, and it took several attempts to get to. The
 * arrangements before this one were an essay, then a FAQ, then a sequence of
 * six topics each announcing itself and answering itself. All three read as
 * something to be read rather than as a product to be looked at.
 *
 * The audience is the professional buying the software, so every object on
 * the page is something she ends up owning: her site, her Tuesday, her
 * deposit, her month. The sample figures are drawn from the trades table, so
 * the prices on screen are the ones her own catalogue starts with.
 *
 * No photographs, by instruction. The stock library is borrowed and several
 * frames show pale hands, which is not what a salon in Cotonou looks like.
 * What replaces them is the product itself.
 *
 * The page keeps the `mk` class so the header and footer still read the
 * marketing palette, and adds `bp` for everything below, which is styled by
 * its own block in globals.css. The older `mk-` landing classes stay where
 * they are because the demo and the module pages are still drawn with them.
 */

/** The sample salon the page is illustrated with: the first trade's. */
const SAMPLE = TRADES[0];

/**
 * A Tuesday that is already full.
 *
 * Invented, and marked as an example on screen. The names are initials
 * because a landing page showing what looks like real customers of a real
 * salon would be claiming something it cannot show.
 */
const DAY = [
  { hour: "08:30", who: "Ama D.", what: SAMPLE.services[0].name, paid: true },
  { hour: "10:30", who: "Sèna K.", what: SAMPLE.services[1].name, paid: true },
  { hour: "14:00", who: "Flore A.", what: SAMPLE.services[3].name, paid: true },
  { hour: "16:00", who: "Inès B.", what: SAMPLE.services[2].name, paid: false },
] as const;

/** One Saturday's availability, which is what a client is actually shown. */
const SLOTS = [
  { hour: "09:00", taken: true, note: "Tresses collées" },
  { hour: "11:00", taken: false, note: "2 h disponibles" },
  { hour: "14:00", taken: true, note: "Pose de tissage" },
  { hour: "17:00", taken: false, note: "1 h disponible" },
] as const;

/**
 * How an account is opened, beside the form rather than on a band of its own.
 *
 * These are the real steps. The first four happen in the next two minutes;
 * the fifth is hers to take whenever she wants, which is the point of it.
 */
const STEPS = [
  { title: "Vous choisissez votre formule", body: "Changeable plus tard, sans perdre votre travail." },
  { title: "Vous ouvrez votre espace", body: "Le nom du salon, votre métier, votre ville, votre numéro." },
  { title: "Vous entrez tout de suite", body: "Pas d'attente, pas de validation, pas de paiement." },
  { title: "Vous préparez votre site", body: "Prestations, tarifs, horaires, photos. Rien n'est visible encore." },
  { title: "Vous le publiez", body: "Depuis Paramètres, le jour où vous êtes prête." },
] as const;

/** 48000 -> "48 000", grouped so a price never wraps mid-number. */
function fcfa(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/[  \s]/g, " ");
}

/** The cheapest thing a trade sells, which is where its card starts. */
function fromPrice(services: readonly { price: number }[]): number {
  return services.reduce((low, service) => Math.min(low, service.price), Infinity);
}

export default async function BeautyPrestPage() {
  // Used only to show whether the installation has been set up yet.
  const providerCount = await prisma.provider
    .count({ where: { status: "ACTIVE" } })
    .catch(() => 0);

  return (
    <div className="mk bp">
      <MarketingHeader />

      <main>
        {/* ---------------------------------------------------------- Hero */}
        <section className="bp-hero">
          <div className="container bp-hero-grid">
            <div>
              <h1 className="bp-h1">Votre salon en ligne. Votre agenda à jour.</h1>
              <p className="bp-one">
                Le logiciel de réservation des métiers de la beauté. Sans
                commission sur vos rendez-vous.
              </p>
              <div className="bp-acts">
                <a href="#inscription" className="bp-btn">
                  Créer mon espace
                </a>
                <Link href="/demo" className="bp-btn bp-btn-quiet">
                  Voir la démo
                </Link>
              </div>
            </div>

            <DayCard />
          </div>
        </section>

        {/* ---------------------------------------------------- Her own site */}
        <section id="site" className="bp-band bp-band-white">
          <div className="container bp-duo">
            <div className="bp-said">
              <h2>Votre site, à votre adresse.</h2>
              <p className="bp-one">
                Vos prestations, vos tarifs, vos photos, vos horaires.
              </p>
            </div>

            <SitePreview />
          </div>
        </section>

        {/* ------------------------------------------------------ Her agenda */}
        <section id="agenda" className="bp-band">
          <div className="container bp-duo bp-duo-flip">
            <div className="bp-said">
              <h2>Un créneau pris disparaît.</h2>
              <p className="bp-one">
                Pour tout le monde, au moment où il part.
              </p>
            </div>

            <SlotsCard />
          </div>
        </section>

        {/* ------------------------------------------------------ Her money */}
        <section className="bp-band bp-band-white">
          <div className="container bp-duo">
            <div className="bp-said">
              <h2>L&apos;acompte avant la cliente.</h2>
              <p className="bp-one">
                Versé à la réservation, sur votre compte.
              </p>
            </div>

            <ReceiptCard />
          </div>
        </section>

        {/* ------------------------------------------------------ Her month */}
        <section className="bp-band">
          <div className="container bp-duo bp-duo-flip">
            <div className="bp-said">
              <h2>Votre mois, en chiffres.</h2>
              <p className="bp-one">
                Ce qui est entré, ce qui se vend, qui revient.
              </p>
            </div>

            <FiguresCard />
          </div>
        </section>

        {/* --------------------------------------------------------- Trades */}
        <section id="metiers" className="bp-band bp-band-white">
          <div className="container">
            <h2 className="bp-wide-title">Six métiers, un même outil.</h2>
            <p className="bp-one bp-wide-one">
              Seule ou en équipe, en salon ou à domicile.
            </p>

            <ul className="bp-trades">
              {TRADES.map((trade) => (
                <li key={trade.id} className="bp-trade">
                  <b>{trade.label}</b>
                  <span>
                    {trade.services.map((service) => service.name).join(", ")}
                  </span>
                  <em>à partir de {fcfa(fromPrice(trade.services))} F</em>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --------------------------------------------------------- Prices */}
        <section id="tarifs" className="bp-band">
          <div className="container">
            <h2 className="bp-wide-title">Un abonnement, jamais une commission.</h2>
            <p className="bp-one bp-wide-one">Deux mois offerts à l&apos;année.</p>

            <div className="bp-plans">
              {PLAN_ORDER.map((plan) => (
                <PlanCard key={plan} plan={plan} />
              ))}
            </div>

            <div id="modules" className="bp-extras">
              <div className="bp-extras-top">
                <b>Modules à la carte</b>
                <span>À ajouter à n&apos;importe quelle formule.</span>
              </div>
              <ul>
                {sellableFeatures().map((feature) => (
                  <li key={feature}>
                    <Link href={`/modules/${FEATURES[feature].slug}`}>
                      <span>{FEATURES[feature].label}</span>
                      <b>{fcfa(moduleMonthly(feature))} F / mois</b>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- Signing up */}
        <section id="inscription" className="bp-band bp-band-white">
          <div className="container">
            <h2 className="bp-wide-title">Créez votre espace.</h2>
            <p className="bp-one bp-wide-one">
              Vous entrez tout de suite. Vous publiez quand vous voulez.
            </p>

            <div className="bp-enroll">
              <ol className="bp-steps">
                {STEPS.map((step) => (
                  <li key={step.title}>
                    <b>{step.title}</b>
                    {step.body}
                  </li>
                ))}
              </ol>

              <div className="bp-enroll-form">
                <SignupForm />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- Close */}
        <section className="bp-close">
          <div className="container bp-close-grid">
            <div>
              <h2>Une question avant de commencer ?</h2>
              <p className="bp-one">
                Écrivez-nous votre métier en une phrase. On répond avec la
                formule qui correspond.
              </p>
            </div>

            <div className="bp-close-acts">
              <a
                href={CONTACT.whatsapp}
                className="bp-btn bp-btn-light"
                target="_blank"
                rel="noreferrer noopener"
              >
                Écrire sur WhatsApp
              </a>
              <a
                href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                className="bp-tel"
              >
                {CONTACT.phone}
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

/* ------------------------------------------------------------------ Pieces */

/** Her Tuesday, already written. The first thing the page shows. */
function DayCard() {
  const paid = DAY.filter((slot) => slot.paid).length;

  return (
    <div className="bp-card bp-day" aria-label="Exemple d'agenda">
      <div className="bp-day-top">
        <b>Mardi 11 novembre</b>
        <span>{DAY.length} rendez-vous</span>
      </div>

      {DAY.map((slot) => (
        <div key={slot.hour} className="bp-slot">
          <span className="bp-hour">{slot.hour}</span>
          <span className="bp-who">
            <b>{slot.who}</b>
            <span>{slot.what}</span>
          </span>
          <span className={slot.paid ? "bp-chip" : "bp-chip bp-chip-grey"}>
            {slot.paid ? "Acompte reçu" : "À confirmer"}
          </span>
        </div>
      ))}

      <div className="bp-day-foot">
        <span>
          {SAMPLE.sampleName}, exemple
        </span>
        <span>
          {paid} acompte{paid > 1 ? "s" : ""} reçu{paid > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

/** What she publishes: her own address, her own prices, her own button. */
function SitePreview() {
  return (
    <div className="bp-card bp-browser">
      <div className="bp-browser-bar">
        <span className="bp-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="bp-url">
          <b>{SAMPLE.id === "ongles" ? "studio-amara" : SAMPLE.id}</b>
          .beautyprest.com
        </span>
      </div>

      <div className="bp-site">
        <div className="bp-site-head">
          <b>{SAMPLE.sampleName}</b>
          <span>{SAMPLE.tagline}</span>
        </div>

        <ul className="bp-site-list">
          {SAMPLE.services.map((service) => (
            <li key={service.name}>
              <span>
                {service.name}
                <em>{humanDuration(service.minutes)}</em>
              </span>
              <b>{fcfa(service.price)} F</b>
            </li>
          ))}
        </ul>

        <span className="bp-btn bp-btn-sm">Réserver</span>
      </div>
    </div>
  );
}

/** A Saturday, from the side her client sees it. */
function SlotsCard() {
  return (
    <div className="bp-card bp-day">
      <div className="bp-day-top">
        <b>Samedi 15 novembre</b>
        <span>Disponibilités</span>
      </div>

      {SLOTS.map((slot) => (
        <div
          key={slot.hour}
          className={slot.taken ? "bp-slot bp-slot-taken" : "bp-slot"}
        >
          <span className="bp-hour">{slot.hour}</span>
          <span className="bp-who">
            <b>{slot.taken ? "Pris" : "Libre"}</b>
            <span>{slot.note}</span>
          </span>
          <span className={slot.taken ? "bp-chip bp-chip-grey" : "bp-chip"}>
            {slot.taken ? "Confirmé" : "Réservable"}
          </span>
        </div>
      ))}

      <div className="bp-day-foot">
        <span>Synchronisé avec Google Calendar</span>
        <span>Rappel envoyé la veille</span>
      </div>
    </div>
  );
}

/** The deposit, with the arithmetic shown rather than described. */
function ReceiptCard() {
  const service = SAMPLE.services[0];
  const deposit = Math.round(service.price * 0.2);

  return (
    <div className="bp-card bp-panel">
      <ul className="bp-receipt">
        <li>
          <span>{service.name}</span>
          <b>{fcfa(service.price)} F</b>
        </li>
        <li>
          <span>Acompte demandé, 20 %</span>
          <b>{fcfa(deposit)} F</b>
        </li>
        <li className="bp-receipt-total">
          <span>Reçu</span>
          <b>{fcfa(deposit)} F</b>
        </li>
      </ul>
      <p className="bp-receipt-note">
        Mobile Money et carte bancaire. La plateforme n&apos;y touche pas.
      </p>
    </div>
  );
}

/**
 * Her month.
 *
 * The figures are an example and the curve is drawn to them, not to a shape
 * chosen for looking good: seven points, the last one highest, each plotted
 * from the same scale.
 */
function FiguresCard() {
  const months = [148, 162, 155, 198, 236, 274, 312];
  const top = Math.max(...months);
  const points = months
    .map((value, index) => {
      const x = 4 + (index * 312) / (months.length - 1);
      const y = 42 - (value / top) * 36;
      return `${x.toFixed(0)},${y.toFixed(0)}`;
    })
    .join(" ");

  return (
    <div className="bp-card bp-panel">
      <div className="bp-figures">
        <div>
          <b>312 000 F</b>
          <span>encaissés en octobre</span>
        </div>
        <div>
          <b>41</b>
          <span>rendez-vous tenus</span>
        </div>
        <div>
          <b>63 %</b>
          <span>de clientes qui reviennent</span>
        </div>
      </div>

      <svg
        className="bp-spark"
        viewBox="0 0 320 46"
        preserveAspectRatio="none"
        role="img"
        aria-label="Encaissements des sept derniers mois, en hausse"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const definition = PLANS[plan];
  const monthly = definition.monthly;

  return (
    <div className="bp-plan" data-pick={definition.recommended ? "true" : undefined}>
      <div className="bp-plan-top">
        <b>{definition.name}</b>
        {definition.recommended ? <span className="bp-reco">Conseillé</span> : null}
      </div>

      <p className="bp-amount">
        {fcfa(monthly)} F<em> / mois</em>
      </p>
      <p className="bp-year">{fcfa(yearlyPrice(monthly))} F par an</p>

      <ul>
        {definition.extends ? (
          <li className="bp-from">Tout {PLANS[definition.extends].name}, plus :</li>
        ) : null}
        {planHighlights(plan).map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <a href="#inscription" className="bp-btn bp-btn-sm bp-plan-pick">
        Choisir {definition.name}
      </a>
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
