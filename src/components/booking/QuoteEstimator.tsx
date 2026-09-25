"use client";

import { useActionState, useMemo, useState } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  computeEstimate,
  type EstimatorConfig,
  type EstimatorAnswers,
} from "@/lib/quotes/estimate";
import { formatMoney } from "@/lib/money";

/**
 * The guided quote (cahier des charges section 18).
 *
 * The customer picks from a few questions and watches the estimate move as she
 * goes, so she knows roughly what it costs before writing a single line. The
 * figure shown here is computed in the browser for responsiveness; the server
 * recomputes it from the same configuration before storing anything, so a
 * tampered form cannot lock in a price.
 */

export type QuoteService = { id: string; name: string };

export function QuoteEstimator({
  config,
  services,
  initialServiceId,
  currency,
  locale,
  intro,
  disclaimer,
  ownerFirstName,
  action,
}: {
  config: EstimatorConfig | null;
  services: QuoteService[];
  initialServiceId?: string;
  currency: string;
  locale: string;
  intro: string | null;
  disclaimer: string | null;
  ownerFirstName: string;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, submit, pending] = useActionState(action, IDLE);
  const [answers, setAnswers] = useState<EstimatorAnswers>({});

  const estimate = useMemo(
    () => (config ? computeEstimate(config, answers) : null),
    [config, answers],
  );

  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  if (state.status === "success") {
    return (
      <div className="card" role="status" style={{ padding: "2rem 1.5rem" }}>
        <p className="font-display" style={{ margin: 0, fontSize: "1.35rem" }}>
          Demande envoyée
        </p>
        <p style={{ margin: ".75rem 0 0", color: "var(--brand-muted)", lineHeight: 1.7 }}>
          {state.message}
        </p>
      </div>
    );
  }

  function toggle(questionId: string, optionId: string, multiple: boolean) {
    setAnswers((current) => {
      const existing = current[questionId] ?? [];
      if (!multiple) return { ...current, [questionId]: [optionId] };
      return {
        ...current,
        [questionId]: existing.includes(optionId)
          ? existing.filter((id) => id !== optionId)
          : [...existing, optionId],
      };
    });
  }

  // formatMoney is pure and Intl works in the browser, so the live total is
  // written exactly like every other price on the site.
  const money = (amount: number) => formatMoney(amount, currency, locale);

  return (
    <form action={submit} noValidate>
      {state.status === "error" ? (
        <p role="alert" className="card" style={errorBanner}>
          {state.message}
        </p>
      ) : null}

      {config && config.questions.length > 0 ? (
        <section style={{ marginBottom: "2rem" }}>
          <h2 className="font-display" style={{ fontSize: "1.35rem", margin: "0 0 .35rem" }}>
            Votre projet en quelques clics
          </h2>
          <p style={{ margin: "0 0 1.5rem", color: "var(--brand-muted)", lineHeight: 1.7, fontSize: ".93rem" }}>
            {intro ??
              "Répondez à ces questions : le tarif approximatif s'affiche au fur et à mesure."}
          </p>

          <div style={{ display: "grid", gap: "1.5rem" }}>
            {config.questions.map((question) => {
              const multiple = question.kind === "MULTI_CHOICE";
              const chosen = answers[question.id] ?? [];

              return (
                <fieldset key={question.id} style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ padding: 0, marginBottom: ".2rem", fontWeight: 700, fontSize: "1rem" }}>
                    {question.label}
                    {question.required ? <span aria-hidden="true"> *</span> : null}
                  </legend>

                  <p style={{ margin: "0 0 .75rem", fontSize: ".85rem", color: "var(--brand-muted)" }}>
                    {question.helpText ??
                      (multiple ? "Plusieurs réponses possibles." : "Une seule réponse.")}
                  </p>

                  <div style={{ display: "grid", gap: ".5rem" }}>
                    {question.options.map((option) => {
                      const selected = chosen.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          style={{
                            display: "flex",
                            gap: ".75rem",
                            alignItems: "flex-start",
                            padding: ".85rem 1rem",
                            borderRadius: 14,
                            border: `1px solid ${selected ? "var(--brand-primary)" : "var(--brand-border)"}`,
                            background: selected
                              ? "color-mix(in srgb, var(--brand-primary) 8%, var(--brand-surface))"
                              : "var(--brand-surface)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type={multiple ? "checkbox" : "radio"}
                            name={`q:${question.id}`}
                            value={option.id}
                            checked={selected}
                            onChange={() => toggle(question.id, option.id, multiple)}
                            style={{ marginTop: ".25rem", flexShrink: 0 }}
                          />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontWeight: 600 }}>{option.label}</span>
                            {option.description ? (
                              <span
                                style={{
                                  display: "block",
                                  fontSize: ".85rem",
                                  color: "var(--brand-muted)",
                                  marginTop: ".15rem",
                                  lineHeight: 1.5,
                                }}
                              >
                                {option.description}
                              </span>
                            ) : null}
                          </span>
                          {option.priceAdjustment !== 0 ? (
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: ".85rem",
                                color: "var(--brand-primary)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {option.priceAdjustment > 0 ? "+" : "−"}
                              {money(Math.abs(option.priceAdjustment))}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </section>
      ) : null}

      {estimate ? (
        <div
          aria-live="polite"
          style={{
            position: "sticky",
            bottom: "1rem",
            zIndex: 10,
            marginBottom: "2rem",
            padding: "1.15rem 1.25rem",
            borderRadius: 18,
            background:
              "linear-gradient(140deg, color-mix(in srgb, var(--brand-accent) 34%, var(--brand-surface)), var(--brand-surface))",
            border: "1px solid var(--brand-border)",
            boxShadow: "0 8px 28px rgb(0 0 0 / 10%)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: ".72rem",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--brand-muted)",
              fontWeight: 600,
            }}
          >
            Estimation
          </p>

          {estimate.complete ? (
            <>
              <p
                className="font-display"
                style={{ margin: ".25rem 0 0", fontSize: "1.6rem", lineHeight: 1.2 }}
              >
                {estimate.min === estimate.max
                  ? money(estimate.total)
                  : `${money(estimate.min)} – ${money(estimate.max)}`}
              </p>
              <p style={{ margin: ".35rem 0 0", fontSize: ".84rem", color: "var(--brand-muted)", lineHeight: 1.55 }}>
                {disclaimer ??
                  `Fourchette indicative. ${ownerFirstName} confirme le tarif exact après avoir vu votre demande.`}
              </p>
            </>
          ) : (
            <p style={{ margin: ".35rem 0 0", fontSize: ".92rem", color: "var(--brand-muted)", lineHeight: 1.6 }}>
              Répondez à {estimate.missing.length === 1 ? "la question" : "les questions"}{" "}
              <strong style={{ color: "var(--brand-text)" }}>
                {estimate.missing.join(", ")}
              </strong>{" "}
              pour voir votre estimation.
            </p>
          )}
        </div>
      ) : null}

      <section>
        <h2 className="font-display" style={{ fontSize: "1.35rem", margin: "0 0 1.25rem" }}>
          Vos coordonnées
        </h2>

        {services.length > 0 ? (
          <div className="field">
            <label className="label" htmlFor="serviceId">
              Prestation concernée
            </label>
            <select
              id="serviceId"
              name="serviceId"
              className="select"
              defaultValue={initialServiceId ?? ""}
            >
              <option value="">Je ne sais pas encore</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <Field id="customerName" label="Nom complet" autoComplete="name" required error={errors.customerName} />
        <Field id="customerPhone" label="Téléphone" type="tel" inputMode="tel" autoComplete="tel" required error={errors.customerPhone} />
        <Field id="customerEmail" label="Email (facultatif)" type="email" inputMode="email" autoComplete="email" error={errors.customerEmail} />

        <div className="field">
          <label className="label" htmlFor="description">
            Précisez votre idée <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            className="textarea"
            required
            maxLength={2000}
            placeholder="Couleurs, occasion, inspiration, tout ce qui peut aider."
            aria-invalid={errors.description ? true : undefined}
          />
          {errors.description ? (
            <p className="error-text" role="alert">
              {errors.description}
            </p>
          ) : null}
        </div>

        <Field id="preferredDate" label="Date souhaitée (facultatif)" type="date" error={errors.preferredDate} />

        <div className="field">
          <label className="label" htmlFor="photo">
            Photo d&apos;inspiration (facultatif)
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="input"
            style={{ paddingBlock: ".55rem" }}
          />
          {errors.photo ? (
            <p className="error-text" role="alert">
              {errors.photo}
            </p>
          ) : (
            <p className="hint">JPG, PNG ou WEBP, 5 Mo maximum.</p>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer ma demande"}
        </button>
      </section>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  type = "text",
  inputMode,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
  inputMode?: "text" | "tel" | "email";
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        className="input"
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const errorBanner: React.CSSProperties = {
  background: "#fbe4e2",
  color: "#8f241c",
  borderColor: "#f1c4c0",
  marginBottom: "1rem",
  fontSize: ".92rem",
};
