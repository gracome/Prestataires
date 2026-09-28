"use client";

import { useActionState } from "react";
import type { BillingPeriod, Plan, PlanFeature } from "@prisma/client";
import { recordPaymentAction, setSubscriptionAction } from "@/app/admin/actions";
import { Panel } from "./ui";
import {
  FEATURES,
  PLANS,
  PLAN_ORDER,
  priceFor,
  sellableFeatures,
} from "@/lib/plans/catalogue";
import { formatMoney } from "@/lib/money";
import type { ActionState } from "@/lib/validation";

/**
 * What an account is subscribed to, and until when.
 *
 * Two separate forms on purpose. Changing the package is an adjustment and
 * never moves the end date; recording a payment moves the end date and never
 * silently changes the package. Merging them would make it impossible to tell,
 * afterwards, whether a period was bought or granted.
 */

const EMPTY: ActionState = { status: "idle" };

export function SubscriptionPanel({
  providerId,
  plan,
  billingPeriod,
  extraModules,
  currency,
  subscriptionEndsAt,
  payments,
}: {
  providerId: string;
  plan: Plan;
  billingPeriod: BillingPeriod;
  extraModules: PlanFeature[];
  currency: string;
  subscriptionEndsAt: string | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    periodEndsAt: string;
    createdAt: string;
  }>;
}) {
  const [planState, planAction, planPending] = useActionState(
    setSubscriptionAction,
    EMPTY,
  );
  const [payState, payAction, payPending] = useActionState(
    recordPaymentAction,
    EMPTY,
  );

  const due = priceFor(plan, billingPeriod, extraModules);
  const endsAt = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null;
  const lapsed = endsAt !== null && endsAt.getTime() < Date.now();
  const modules = sellableFeatures();
  const granted = new Set(PLANS[plan].grants);

  return (
    <Panel title="Abonnement">
      <p style={note}>
        {endsAt === null
          ? "Aucune échéance : ce compte n'est pas facturé et ne sera pas suspendu."
          : lapsed
            ? `Échu depuis le ${formatDay(endsAt)}. Le compte est suspendu automatiquement.`
            : `Valable jusqu'au ${formatDay(endsAt)}.`}
      </p>

      <form action={planAction} style={{ display: "grid", gap: ".7rem" }}>
        <input type="hidden" name="providerId" value={providerId} />

        <label style={label}>
          Formule
          <select name="plan" defaultValue={plan} className="select">
            {PLAN_ORDER.map((key) => (
              <option key={key} value={key}>
                {PLANS[key].name} — {formatMoney(PLANS[key].monthly, currency)}/mois
              </option>
            ))}
          </select>
        </label>

        <label style={label}>
          Périodicité
          <select name="billingPeriod" defaultValue={billingPeriod} className="select">
            <option value="MONTHLY">Mensuelle</option>
            <option value="YEARLY">Annuelle — 2 mois offerts</option>
          </select>
        </label>

        <fieldset style={fieldset}>
          <legend style={legend}>Modules ajoutés</legend>
          {modules.map((feature) => {
            const included = granted.has(feature);
            return (
              <label key={feature} style={checkbox}>
                <input
                  type="checkbox"
                  name={`module:${feature}`}
                  defaultChecked={extraModules.includes(feature)}
                  disabled={included}
                />
                <span style={{ opacity: included ? 0.55 : 1 }}>
                  {FEATURES[feature].label}
                  {included ? (
                    <em style={hint}> — déjà dans la formule</em>
                  ) : (
                    <em style={hint}>
                      {" "}
                      — {formatMoney(FEATURES[feature].monthly, currency)}/mois
                    </em>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>

        <button type="submit" className="btn btn-secondary" disabled={planPending}>
          {planPending ? "Enregistrement…" : "Mettre à jour l'abonnement"}
        </button>

        <Feedback state={planState} />
      </form>

      <hr style={rule} />

      <form action={payAction} style={{ display: "grid", gap: ".7rem" }}>
        <input type="hidden" name="providerId" value={providerId} />

        <p style={{ ...note, marginTop: 0 }}>
          Enregistrer un règlement prolonge la période de{" "}
          {billingPeriod === "YEARLY" ? "douze mois" : "un mois"} et réactive un
          compte suspendu.
        </p>

        <label style={label}>
          Montant reçu
          <input
            type="number"
            name="amount"
            min={0}
            step={100}
            defaultValue={due}
            className="input"
          />
        </label>

        <label style={label}>
          Moyen de paiement
          <select name="method" defaultValue="MOBILE_MONEY" className="select">
            <option value="MOBILE_MONEY">Mobile money</option>
            <option value="CASH">Espèces</option>
            <option value="BANK_TRANSFER">Virement</option>
            <option value="CARD">Carte</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>

        <label style={label}>
          Référence ou note
          <input type="text" name="note" maxLength={500} className="input" />
        </label>

        <button type="submit" className="btn btn-primary" disabled={payPending}>
          {payPending ? "Enregistrement…" : "Enregistrer le paiement"}
        </button>

        <Feedback state={payState} />
      </form>

      {payments.length > 0 ? (
        <>
          <hr style={rule} />
          <p style={{ ...note, marginTop: 0 }}>Derniers règlements</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".4rem" }}>
            {payments.map((payment) => (
              <li key={payment.id} style={row}>
                <span>{formatDay(new Date(payment.createdAt))}</span>
                <span style={{ fontWeight: 600 }}>
                  {formatMoney(payment.amount, payment.currency)}
                </span>
                <span style={{ color: "var(--admin-muted)", fontSize: ".78rem" }}>
                  jusqu&apos;au {formatDay(new Date(payment.periodEndsAt))}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      style={{
        margin: 0,
        fontSize: ".84rem",
        color: state.status === "error" ? "var(--admin-danger, #b42318)" : "inherit",
      }}
    >
      {state.message}
    </p>
  );
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const note = {
  margin: "-.4rem 0 .9rem",
  fontSize: ".82rem",
  color: "var(--admin-muted)",
  lineHeight: 1.6,
} as const;

const label = {
  display: "grid",
  gap: ".3rem",
  fontSize: ".82rem",
  fontWeight: 600,
} as const;

const fieldset = {
  border: "1px solid var(--admin-border, rgba(0,0,0,.1))",
  borderRadius: 10,
  padding: ".7rem .8rem",
  display: "grid",
  gap: ".4rem",
} as const;

const legend = { fontSize: ".78rem", fontWeight: 700, padding: "0 .3rem" } as const;

const checkbox = {
  display: "flex",
  alignItems: "baseline",
  gap: ".5rem",
  fontSize: ".84rem",
  fontWeight: 400,
} as const;

const hint = { color: "var(--admin-muted)", fontStyle: "normal" } as const;

const rule = {
  border: 0,
  borderTop: "1px solid var(--admin-border, rgba(0,0,0,.1))",
  margin: "1.1rem 0",
} as const;

const row = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: ".6rem",
  fontSize: ".84rem",
} as const;
