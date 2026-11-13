"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { signUpAction } from "@/app/inscription/actions";
import { PLANS, PLAN_ORDER } from "@/lib/plans/catalogue";
import { TRADES } from "@/lib/marketing/trades";
import type { ActionState } from "@/lib/validation";

/**
 * Opening an account, on the page that sells it.
 *
 * The package is picked here rather than on a screen of its own: a visitor
 * who has to leave the form to find out what she is buying rarely comes back
 * to it. The price list above sets this field through `initialPlan` and the
 * anchor, so the figure she just read is the one already selected when she
 * arrives.
 *
 * Nothing is asked that the dashboard can ask better. Opening hours,
 * prestations and photographs all have a screen inside, where she can see
 * what her answer changes; asking for them out here would be a form eight
 * fields longer and an account no further along.
 */

const EMPTY: ActionState = { status: "idle" };

/** The trade list the marketing pages show, mapped to the platform's ids. */
const TRADE_ACTIVITY: Record<string, string> = {
  ongles: "ongles",
  coiffure: "coiffure",
  cils: "cils-sourcils",
  maquillage: "esthetique",
  esthetique: "esthetique",
  barbier: "barbier",
};

export function SignupForm({ initialPlan = "RENDEZ_VOUS" }: { initialPlan?: string }) {
  const [state, action] = useActionState(signUpAction, EMPTY);
  const [plan, setPlan] = useState(initialPlan);
  const base = useId();

  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={action} className="bp-form" noValidate>
      <h3 className="bp-form-title">Créez votre espace</h3>

      <fieldset className="bp-picker">
        <legend>Votre formule</legend>

        {PLAN_ORDER.map((key) => {
          const definition = PLANS[key];
          return (
            <label
              key={key}
              className="bp-pick"
              data-on={plan === key ? "true" : undefined}
            >
              <input
                type="radio"
                name="plan"
                value={key}
                checked={plan === key}
                onChange={() => setPlan(key)}
              />
              <span>{definition.name}</span>
              <em>{definition.monthly.toLocaleString("fr-FR")} F / mois</em>
            </label>
          );
        })}
      </fieldset>

      <Field
        id={`${base}-business`}
        name="businessName"
        label="Nom de votre salon"
        placeholder="Studio Amara"
        autoComplete="organization"
        error={errors.businessName}
      />

      <div className="bp-row2">
        <div className="bp-field">
          <label htmlFor={`${base}-activity`}>Votre métier</label>
          <select id={`${base}-activity`} name="activity" defaultValue="ongles">
            {TRADES.map((trade) => (
              <option key={trade.id} value={TRADE_ACTIVITY[trade.id] ?? "autre"}>
                {trade.label}
              </option>
            ))}
            <option value="autre">Un autre métier</option>
          </select>
        </div>

        <Field
          id={`${base}-city`}
          name="city"
          label="Votre ville"
          defaultValue="Cotonou"
          autoComplete="address-level2"
          error={errors.city}
        />
      </div>

      <div className="bp-row2">
        <Field
          id={`${base}-owner`}
          name="ownerName"
          label="Votre nom"
          placeholder="Amara D."
          autoComplete="name"
          error={errors.ownerName}
        />

        <Field
          id={`${base}-phone`}
          name="phone"
          label="Numéro WhatsApp"
          type="tel"
          placeholder="+229 ..."
          autoComplete="tel"
          error={errors.phone}
        />
      </div>

      <Field
        id={`${base}-email`}
        name="email"
        label="Votre e-mail"
        type="email"
        placeholder="amara@exemple.com"
        autoComplete="email"
        error={errors.email}
      />

      <div className="bp-row2">
        <Field
          id={`${base}-password`}
          name="password"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          hint="10 caractères au minimum."
          error={errors.password}
        />

        <Field
          id={`${base}-confirm`}
          name="confirmPassword"
          label="Confirmez"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />
      </div>

      {state.status === "error" && !hasFieldError(errors) ? (
        <p className="bp-form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <Submit />

      <p className="bp-form-note">
        Aucun paiement à cette étape. Votre site reste invisible jusqu&apos;au
        jour où vous le publiez.
      </p>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="bp-btn bp-btn-wide" disabled={pending}>
      {pending ? "Ouverture..." : "Créer mon espace"}
    </button>
  );
}

function Field({
  id,
  name,
  label,
  error,
  hint,
  type = "text",
  ...rest
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <div className="bp-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <p className="bp-field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="bp-field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function hasFieldError(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}
