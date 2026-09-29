"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TRADES,
  fcfa,
  humanDuration,
  tradeById,
  type Trade,
} from "@/lib/marketing/trades";

/**
 * The demo, driven by the visitor.
 *
 * A screenshot of somebody else's salon proves nothing to a barber. So rather
 * than showing one finished site, this lets her assemble her own in about ten
 * seconds — her trade, her name, her city — and shows two things at once: the
 * site her clients would see, and the figures she would be reading on Monday
 * morning.
 *
 * The second half is the part that actually sells. A provider does not buy a
 * website; she buys the answer to "est-ce que ça me rapporte plus que ça me
 * coûte", and here she can read that answer against her own numbers instead of
 * ours. We are careful to state the arithmetic rather than dress it up: the
 * moment a projection looks like a promise, it stops being trustworthy.
 *
 * Everything is computed in the browser. Nothing is stored, nothing is sent —
 * a visitor who has not signed up yet has no reason to hand us her prices.
 */

export type PlanOption = { name: string; monthly: number };

/** Weeks in an average month. 52/12, not 4 — using 4 understates by 8 %. */
const WEEKS_PER_MONTH = 52 / 12;

export function DemoStudio({ plans }: { plans: readonly PlanOption[] }) {
  const [tradeId, setTradeId] = useState(TRADES[0].id);
  const [name, setName] = useState("");
  const [city, setCity] = useState("Cotonou");
  const [perWeek, setPerWeek] = useState(12);

  const trade = tradeById(tradeId);
  const businessName = name.trim() || trade.sampleName;

  const figures = useMemo(() => project(trade, perWeek), [trade, perWeek]);

  // The most capable plan the projected revenue comfortably covers — read from
  // the top down, since plans are ordered cheapest first. "Comfortably" is
  // deliberately conservative: a subscription eating more than a twentieth of
  // what she earns is not one we should be putting in front of her. Quoting
  // the cheapest instead would be worse than useless, as the entry formula
  // carries no booking at all and the demo she is looking at is a booking.
  const affordable =
    [...plans].reverse().find((plan) => plan.monthly * 20 <= figures.revenue) ??
    plans[0];

  return (
    <div className="mk-studio">
      <form
        className="mk-studio-panel"
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset className="mk-field">
          <legend>Votre métier</legend>
          <div className="mk-chips">
            {TRADES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="mk-chip"
                data-on={option.id === tradeId ? "true" : undefined}
                aria-pressed={option.id === tradeId}
                onClick={() => setTradeId(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mk-field-row">
          <label className="mk-field">
            <span>Le nom de votre activité</span>
            <input
              type="text"
              value={name}
              maxLength={40}
              placeholder={trade.sampleName}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="mk-field">
            <span>Votre ville</span>
            <input
              type="text"
              value={city}
              maxLength={30}
              placeholder="Cotonou"
              onChange={(event) => setCity(event.target.value)}
            />
          </label>
        </div>

        <label className="mk-field">
          <span>
            Rendez-vous par semaine :{" "}
            <strong className="mk-field-value">{perWeek}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={perWeek}
            onChange={(event) => setPerWeek(Number(event.target.value))}
          />
        </label>

        {/* Figures answer "what would I get". The page behind this button
            answers "what is it like to use", which is the question she asks
            next and the one a picture cannot answer. Her choices travel with
            her so she does not start again on a page that is already hers. */}
        <Link
          href={`/demo?metier=${tradeId}&nom=${encodeURIComponent(name.trim())}`}
          className="mk-btn"
        >
          Essayer pour de vrai →
        </Link>

        <p className="mk-studio-note">
          Rien n&apos;est enregistré. Tout est calculé dans votre navigateur, à
          partir de tarifs courants que vous remplacerez par les vôtres.
        </p>
      </form>

      <div className="mk-studio-stage" style={{ ["--demo" as string]: trade.accent }}>
        <SitePreview trade={trade} businessName={businessName} city={city} />
        <BoardPreview
          trade={trade}
          figures={figures}
          perWeek={perWeek}
          plan={affordable}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Figures = {
  average: number;
  revenue: number;
  hours: number;
  noShowSaved: number;
};

/**
 * What a month looks like at this rhythm.
 *
 * The no-show line is the one honest number we can put on deposits: a
 * requested deposit does not make every cancellation disappear, so we count
 * only a fifth of the appointments as ones it protects, and say so.
 */
function project(trade: Trade, perWeek: number): Figures {
  const total = trade.services.reduce((sum, service) => sum + service.price, 0);
  const average = Math.round(total / trade.services.length);

  const minutes = trade.services.reduce((sum, service) => sum + service.minutes, 0);
  const averageMinutes = minutes / trade.services.length;

  const monthly = perWeek * WEEKS_PER_MONTH;

  return {
    average,
    revenue: Math.round((monthly * average) / 500) * 500,
    hours: Math.round((monthly * averageMinutes) / 60),
    noShowSaved: Math.round((monthly * 0.2 * average * 0.3) / 500) * 500,
  };
}

function SitePreview({
  trade,
  businessName,
  city,
}: {
  trade: Trade;
  businessName: string;
  city: string;
}) {
  return (
    <figure className="mk-preview">
      <figcaption className="mk-preview-cap">
        Ce que vos {trade.clients} voient
      </figcaption>

      <div className="mk-phone">
        <div className="mk-phone-bar">
          <span className="mk-phone-url">
            {slugify(businessName)}.prestataires.app
          </span>
        </div>

        <div className="mk-phone-screen">
          <div className="mk-demo-hero">
            <p className="mk-demo-name">{businessName}</p>
            <p className="mk-demo-tag">{trade.tagline}</p>
            {city.trim() ? <p className="mk-demo-city">{city.trim()}</p> : null}
            <span className="mk-demo-cta">Prendre rendez-vous</span>
          </div>

          <ul className="mk-demo-services">
            {trade.services.map((service) => (
              <li key={service.name}>
                <span>
                  <strong>{service.name}</strong>
                  <em>{humanDuration(service.minutes)}</em>
                </span>
                <b>{fcfa(service.price)} F</b>
              </li>
            ))}
          </ul>

          <div className="mk-demo-slots">
            <p>Samedi 4 octobre</p>
            <div>
              {["09:00", "10:30", "14:00", "16:00"].map((slot) => (
                <span key={slot} data-on={slot === "14:00" ? "true" : undefined}>
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function BoardPreview({
  trade,
  figures,
  perWeek,
  plan,
}: {
  trade: Trade;
  figures: Figures;
  perWeek: number;
  plan: PlanOption;
}) {
  const share = figures.revenue > 0 ? (plan.monthly / figures.revenue) * 100 : 0;

  // How many recovered appointments pay for the month. A barber at 3 000 F a
  // cut needs two; a bridal make-up artist needs a fraction of one. Saying so
  // in her own prices is the whole argument.
  const payback = Math.max(1, Math.ceil(plan.monthly / figures.average));

  return (
    <figure className="mk-preview">
      <figcaption className="mk-preview-cap">Ce que vous, vous voyez</figcaption>

      <div className="mk-board">
        <div className="mk-board-grid">
          <Stat
            label="Encaissé ce mois"
            value={`${fcfa(figures.revenue)} F`}
            hint={`${Math.round(perWeek * WEEKS_PER_MONTH)} rendez-vous`}
          />
          <Stat
            label="Panier moyen"
            value={`${fcfa(figures.average)} F`}
            hint="moyenne de vos prestations"
          />
          <Stat
            label="Temps en cabine"
            value={`${figures.hours} h`}
            hint="dans le mois"
          />
          <Stat
            label="Sauvé par les acomptes"
            value={`${fcfa(figures.noShowSaved)} F`}
            hint="estimation prudente"
          />
        </div>

        <p className="mk-board-verdict">
          À ce rythme, la formule <strong>{plan.name}</strong> coûte{" "}
          {fcfa(plan.monthly)} F par mois, soit{" "}
          <strong>{share.toFixed(1).replace(".", ",")} %</strong> de ce que
          vous encaissez.{" "}
          {payback <= 1
            ? "Un seul rendez-vous récupéré la rembourse."
            : `${payback} rendez-vous récupérés la remboursent.`}
        </p>

        <p className="mk-board-fine">
          Calcul : {perWeek} rendez-vous par semaine au panier moyen d&apos;une{" "}
          {trade.practitioner}, sur 4,3 semaines. Les acomptes comptent un
          rendez-vous annulé sur cinq, récupéré à 30 %.
        </p>
      </div>
    </figure>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="mk-board-stat">
      <p className="mk-board-label">{label}</p>
      <p className="mk-board-value">{value}</p>
      <p className="mk-board-hint">{hint}</p>
    </div>
  );
}

/** "Maison Lokossa" -> "maison-lokossa". Only for showing a plausible URL. */
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28) || "votre-nom"
  );
}
