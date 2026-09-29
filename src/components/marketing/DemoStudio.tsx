"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TRADES, fcfa, tradeById, type Trade } from "@/lib/marketing/trades";

/**
 * What a month looks like, at her rhythm.
 *
 * This used to show a mock of her public site beside the figures. It was a
 * drawing of a site, not a site — and next to a demo where she can open the
 * real thing, a drawing is worse than nothing: it sets an expectation the
 * product then has to match. The mock is gone; the button below the controls
 * opens the working demo instead.
 *
 * What is left is the half a picture cannot do: her own arithmetic. A provider
 * does not buy a website, she buys the answer to "est-ce que ça me rapporte
 * plus que ça me coûte", and here she reads that answer against her numbers
 * rather than ours. The calculation is spelled out under the figures — the
 * moment a projection looks like a promise, it stops being trustworthy.
 *
 * Everything is computed in the browser. Nothing is stored, nothing is sent.
 */

export type PlanOption = { name: string; monthly: number };

/** Weeks in an average month. 52/12, not 4 — using 4 understates by 8 %. */
const WEEKS_PER_MONTH = 52 / 12;

export function DemoStudio({ plans }: { plans: readonly PlanOption[] }) {
  const [tradeId, setTradeId] = useState(TRADES[0].id);
  const [name, setName] = useState("");
  const [perWeek, setPerWeek] = useState(12);

  const trade = tradeById(tradeId);
  const figures = useMemo(() => project(trade, perWeek), [trade, perWeek]);

  // The most capable plan the projected revenue comfortably covers — read from
  // the top down, since plans are ordered cheapest first. "Comfortably" is
  // deliberately conservative: a subscription eating more than a twentieth of
  // what she earns is not one we should be putting in front of her. Quoting
  // the cheapest instead would be worse than useless, as the entry formula
  // carries no booking at all.
  const plan =
    [...plans].reverse().find((option) => option.monthly * 20 <= figures.revenue) ??
    plans[0];

  const share = figures.revenue > 0 ? (plan.monthly / figures.revenue) * 100 : 0;

  // How many recovered appointments pay for the month. A barber at 3 000 F a
  // cut needs two; a bridal make-up artist needs a fraction of one. Saying so
  // in her own prices is the whole argument.
  const payback = Math.max(1, Math.ceil(plan.monthly / figures.average));

  return (
    <div className="mk-studio">
      <form className="mk-studio-panel" onSubmit={(event) => event.preventDefault()}>
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
            next. Her choices travel with her so she does not start again on a
            page whose whole point is that it is already hers. */}
        <Link
          href={`/demo?metier=${tradeId}&nom=${encodeURIComponent(name.trim())}`}
          className="mk-btn"
        >
          Essayer la démo →
        </Link>
      </form>

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
          <strong>{share.toFixed(1).replace(".", ",")} %</strong> de ce que vous
          encaissez.{" "}
          {payback <= 1
            ? "Un seul rendez-vous récupéré la rembourse."
            : `${payback} rendez-vous récupérés la remboursent.`}
        </p>

        <p className="mk-board-fine">
          Calcul : {perWeek} rendez-vous par semaine au panier moyen d&apos;une{" "}
          {trade.practitioner}, sur 4,3 semaines. Les acomptes comptent un
          rendez-vous annulé sur cinq, récupéré à 30 %. Rien n&apos;est
          enregistré — tout est calculé dans votre navigateur.
        </p>
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
