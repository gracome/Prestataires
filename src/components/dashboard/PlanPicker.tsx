"use client";

import { useActionState, useState } from "react";
import { startCheckoutAction, type CheckoutState } from "@/app/dashboard/actions/subscription";

export type PlanOption = {
  id: "ESSENTIEL" | "RENDEZ_VOUS" | "BUSINESS";
  name: string;
  emoji: string;
  pitch: string;
  highlights: string[];
  monthlyLabel: string;
  yearlyLabel: string;
  yearlySavingLabel: string | null;
};

const IDLE: CheckoutState = { status: "idle" };

/**
 * Choose a package and a period, then pay.
 *
 * Prices are computed on the server and only displayed here; the amount
 * actually charged is worked out again when the payment starts, so nothing a
 * browser sends can change it.
 */
export function PlanPicker({
  plans,
  current,
  online,
}: {
  plans: PlanOption[];
  current: PlanOption["id"];
  online: boolean;
}) {
  const [plan, setPlan] = useState<PlanOption["id"]>(current);
  const [period, setPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [state, action, pending] = useActionState(startCheckoutAction, IDLE);

  const chosen = plans.find((p) => p.id === plan) ?? plans[0];
  const price = period === "YEARLY" ? chosen.yearlyLabel : chosen.monthlyLabel;

  return (
    <form action={action} className="plan-picker">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="billingPeriod" value={period} />

      <div className="plan-period" role="radiogroup" aria-label="Durée">
        {(["MONTHLY", "YEARLY"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={period === value}
            className="plan-period-option"
            data-on={period === value ? "" : undefined}
            onClick={() => setPeriod(value)}
          >
            {value === "MONTHLY" ? "Au mois" : "À l'année"}
            {value === "YEARLY" ? <span className="plan-period-badge">2 mois offerts</span> : null}
          </button>
        ))}
      </div>

      <div className="plan-cards" role="radiogroup" aria-label="Offre">
        {plans.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={plan === option.id}
            className="plan-card"
            data-on={plan === option.id ? "" : undefined}
            onClick={() => setPlan(option.id)}
          >
            <span className="plan-card-head">
              <span className="plan-card-name">
                {option.emoji} {option.name}
              </span>
              {option.id === current ? <span className="plan-card-current">Actuelle</span> : null}
            </span>
            <span className="plan-card-price">
              {period === "YEARLY" ? option.yearlyLabel : option.monthlyLabel}
              <span className="plan-card-unit">{period === "YEARLY" ? " / an" : " / mois"}</span>
            </span>
            {period === "YEARLY" && option.yearlySavingLabel ? (
              <span className="plan-card-saving">Économie : {option.yearlySavingLabel}</span>
            ) : null}
            <span className="plan-card-pitch">{option.pitch}</span>
            <ul className="plan-card-list">
              {option.highlights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {state.status === "error" ? (
        <p className="plan-error" role="alert">
          {state.message}
        </p>
      ) : null}

      {online ? (
        <div className="plan-pay">
          <button type="submit" className="plan-pay-button" disabled={pending}>
            {pending ? "Ouverture du paiement…" : `Payer ${price}`}
          </button>
          <span className="plan-pay-hint">
            Paiement sécurisé par FedaPay : Mobile Money (MTN, Moov, Celtiis) ou carte bancaire.
            Votre abonnement est prolongé dès la confirmation.
          </span>
        </div>
      ) : null}
    </form>
  );
}
