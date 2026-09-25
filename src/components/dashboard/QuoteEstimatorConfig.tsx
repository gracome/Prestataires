"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deleteQuoteOptionAction,
  deleteQuoteQuestionAction,
  saveQuoteOptionAction,
  saveQuoteQuestionAction,
  saveQuoteSettingsAction,
} from "@/app/dashboard/actions/quotes";
import { Feedback } from "./SettingsForms";

/**
 * Configuration of the guided estimator (cahier des charges section 18).
 *
 * The provider sets a starting price and a few questions whose answers add to
 * it. A customer then sees a range before writing, instead of facing a blank
 * form and guessing whether she can afford the work.
 */

export type EstimatorSettings = {
  estimatorEnabled: boolean;
  basePrice: number;
  baseDurationMinutes: number;
  marginPercent: number;
  intro: string;
  disclaimer: string;
};

export type ConfigOption = {
  id: string;
  label: string;
  description: string | null;
  priceAdjustment: number;
  durationAdjustment: number;
};

export type ConfigQuestion = {
  id: string;
  label: string;
  helpText: string | null;
  kind: "SINGLE_CHOICE" | "MULTI_CHOICE";
  required: boolean;
  options: ConfigOption[];
};

export function QuoteEstimatorConfig({
  settings,
  questions,
  currencyLabel,
  sampleRange,
}: {
  settings: EstimatorSettings;
  questions: ConfigQuestion[];
  currencyLabel: string;
  /** Pre-formatted example of the cheapest possible answer set. */
  sampleRange: string | null;
}) {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <SettingsForm
        settings={settings}
        currencyLabel={currencyLabel}
        sampleRange={sampleRange}
      />
      <QuestionList questions={questions} currencyLabel={currencyLabel} />
    </div>
  );
}

function SettingsForm({
  settings,
  currencyLabel,
  sampleRange,
}: {
  settings: EstimatorSettings;
  currencyLabel: string;
  sampleRange: string | null;
}) {
  const [state, submit, pending] = useActionState(saveQuoteSettingsAction, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={submit} className="card" noValidate>
      <Feedback state={state} />

      <div className="field">
        <label style={checkboxLabel}>
          <input
            type="checkbox"
            name="estimatorEnabled"
            defaultChecked={settings.estimatorEnabled}
          />
          <span>Proposer une estimation de prix sur la page devis</span>
        </label>
        <p className="hint">
          Décoché, la page reste un simple formulaire de contact.
        </p>
      </div>

      <div style={grid}>
        <Text
          id="basePrice"
          label={`Prix de départ en ${currencyLabel}`}
          type="number"
          defaultValue={String(settings.basePrice)}
          hint="Le plancher de toute estimation, avant les options."
          error={errors.basePrice}
        />
        <Text
          id="baseDurationMinutes"
          label="Durée de départ (minutes)"
          type="number"
          defaultValue={String(settings.baseDurationMinutes)}
          error={errors.baseDurationMinutes}
        />
        <Text
          id="marginPercent"
          label="Marge annoncée (%)"
          type="number"
          defaultValue={String(settings.marginPercent)}
          hint="15 transforme 10 000 en « entre 8 500 et 11 500 »."
          error={errors.marginPercent}
        />
      </div>

      {sampleRange ? (
        <p
          style={{
            margin: "0 0 1rem",
            padding: ".7rem .85rem",
            background: "var(--tone-info-bg)",
            color: "var(--tone-info-fg)",
            borderRadius: 10,
            fontSize: ".88rem",
            lineHeight: 1.55,
          }}
        >
          Avec la configuration actuelle, la demande la moins chère affichera{" "}
          <strong>{sampleRange}</strong>.
        </p>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="intro">
          Texte au-dessus des questions
        </label>
        <textarea
          id="intro"
          name="intro"
          className="textarea"
          defaultValue={settings.intro}
          maxLength={600}
          style={{ minHeight: 70 }}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="disclaimer">
          Mention sous le prix
        </label>
        <textarea
          id="disclaimer"
          name="disclaimer"
          className="textarea"
          defaultValue={settings.disclaimer}
          maxLength={400}
          style={{ minHeight: 60 }}
          placeholder="Fourchette indicative, le tarif exact est confirmé après échange."
        />
        <p className="hint">
          Dites clairement qu&apos;il s&apos;agit d&apos;une estimation : cela
          évite les malentendus le jour du rendez-vous.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer l'estimateur"}
      </button>
    </form>
  );
}

function QuestionList({
  questions,
  currencyLabel,
}: {
  questions: ConfigQuestion[];
  currencyLabel: string;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  return (
    <section className="card">
      <p style={{ margin: "0 0 .35rem", fontWeight: 700 }}>Les questions</p>
      <p style={{ margin: "0 0 1.25rem", fontSize: ".86rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        Chaque réponse ajoute un montant au prix de départ. Trois ou quatre
        questions suffisent : au-delà, la cliente abandonne.
      </p>

      <Feedback state={feedback} />

      {questions.length === 0 && editing !== "new" ? (
        <p
          style={{
            margin: "0 0 1rem",
            padding: ".85rem 1rem",
            background: "var(--tone-warning-bg)",
            color: "var(--tone-warning-fg)",
            borderRadius: 10,
            fontSize: ".88rem",
            lineHeight: 1.6,
          }}
        >
          Aucune question. Sans question, aucune estimation ne peut être
          calculée et la page reste un simple formulaire.
        </p>
      ) : null}

      <div style={{ display: "grid", gap: ".75rem" }}>
        {questions.map((question) => (
          <div key={question.id}>
            {editing === question.id ? (
              <QuestionForm question={question} onDone={() => setEditing(null)} />
            ) : (
              <div
                style={{
                  border: "1px solid var(--admin-border)",
                  borderRadius: 12,
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: ".75rem",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    marginBottom: ".75rem",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {question.label}
                      {question.required ? null : (
                        <span className="pill pill-neutral" style={{ marginLeft: ".5rem" }}>
                          Facultative
                        </span>
                      )}
                    </p>
                    <p style={{ margin: ".2rem 0 0", fontSize: ".82rem", color: "var(--admin-muted)" }}>
                      {question.kind === "MULTI_CHOICE"
                        ? "Plusieurs réponses possibles"
                        : "Une seule réponse"}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: ".3rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={smallButton}
                      onClick={() => setEditing(question.id)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("Supprimer cette question et ses réponses ?")) return;
                        startTransition(async () => {
                          setFeedback(await deleteQuoteQuestionAction(question.id));
                        });
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <OptionList
                  questionId={question.id}
                  options={question.options}
                  currencyLabel={currencyLabel}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {editing === "new" ? (
        <div style={{ marginTop: ".75rem" }}>
          <QuestionForm onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: questions.length > 0 ? "1rem" : 0 }}
          onClick={() => setEditing("new")}
        >
          Ajouter une question
        </button>
      )}
    </section>
  );
}

function QuestionForm({
  question,
  onDone,
}: {
  question?: ConfigQuestion;
  onDone: () => void;
}) {
  const action = async (previous: ActionState, formData: FormData) =>
    saveQuoteQuestionAction(question?.id ?? null, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form action={submit} noValidate style={formBox}>
      {state.status === "error" ? <Feedback state={state} /> : null}

      <Text
        id={`label-${question?.id ?? "new"}`}
        name="label"
        label="Question"
        defaultValue={question?.label}
        error={errors.label}
        required
      />

      <Text
        id={`helpText-${question?.id ?? "new"}`}
        name="helpText"
        label="Précision sous la question"
        defaultValue={question?.helpText ?? ""}
        error={errors.helpText}
      />

      <div className="field">
        <label className="label" htmlFor={`kind-${question?.id ?? "new"}`}>
          Type de réponse
        </label>
        <select
          id={`kind-${question?.id ?? "new"}`}
          name="kind"
          className="select"
          defaultValue={question?.kind ?? "SINGLE_CHOICE"}
        >
          <option value="SINGLE_CHOICE">Une seule réponse</option>
          <option value="MULTI_CHOICE">Plusieurs réponses possibles</option>
        </select>
      </div>

      <div className="field">
        <label style={checkboxLabel}>
          <input type="checkbox" name="required" defaultChecked={question?.required ?? true} />
          <span>Réponse obligatoire pour afficher le prix</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" style={smallButton} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function OptionList({
  questionId,
  options,
  currencyLabel,
}: {
  questionId: string;
  options: ConfigOption[];
  currencyLabel: string;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  return (
    <div style={{ borderTop: "1px solid var(--admin-border)", paddingTop: ".75rem" }}>
      <Feedback state={feedback} />

      {options.length === 0 ? (
        <p style={{ margin: "0 0 .6rem", fontSize: ".84rem", color: "var(--tone-warning-fg)" }}>
          Aucune réponse : cette question sera ignorée.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: "0 0 .6rem", padding: 0, display: "grid", gap: ".35rem" }}>
          {options.map((option) => (
            <li key={option.id}>
              {editing === option.id ? (
                <OptionForm
                  questionId={questionId}
                  option={option}
                  currencyLabel={currencyLabel}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: ".6rem",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    fontSize: ".88rem",
                    padding: ".35rem 0",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    {option.label}
                    {option.durationAdjustment !== 0 ? (
                      <span style={{ color: "var(--admin-muted)" }}>
                        {" "}
                        · {option.durationAdjustment > 0 ? "+" : ""}
                        {option.durationAdjustment} min
                      </span>
                    ) : null}
                  </span>
                  <span style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "var(--admin-accent)", whiteSpace: "nowrap" }}>
                      {option.priceAdjustment > 0 ? "+" : ""}
                      {option.priceAdjustment} {currencyLabel}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={tinyButton}
                      onClick={() => setEditing(option.id)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ ...tinyButton, color: "var(--tone-danger-fg)" }}
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("Supprimer cette réponse ?")) return;
                        startTransition(async () => {
                          setFeedback(await deleteQuoteOptionAction(option.id));
                        });
                      }}
                    >
                      Suppr.
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing === "new" ? (
        <OptionForm
          questionId={questionId}
          currencyLabel={currencyLabel}
          onDone={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          style={tinyButton}
          onClick={() => setEditing("new")}
        >
          Ajouter une réponse
        </button>
      )}
    </div>
  );
}

function OptionForm({
  questionId,
  option,
  currencyLabel,
  onDone,
}: {
  questionId: string;
  option?: ConfigOption;
  currencyLabel: string;
  onDone: () => void;
}) {
  const action = async (previous: ActionState, formData: FormData) =>
    saveQuoteOptionAction(questionId, option?.id ?? null, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  const suffix = option?.id ?? `new-${questionId}`;

  return (
    <form action={submit} noValidate style={{ ...formBox, marginTop: ".5rem" }}>
      {state.status === "error" ? <Feedback state={state} /> : null}

      <Text
        id={`optlabel-${suffix}`}
        name="label"
        label="Réponse"
        defaultValue={option?.label}
        error={errors.label}
        required
      />

      <Text
        id={`optdesc-${suffix}`}
        name="description"
        label="Précision (facultatif)"
        defaultValue={option?.description ?? ""}
        error={errors.description}
      />

      <div style={grid}>
        <Text
          id={`optprice-${suffix}`}
          name="priceAdjustment"
          label={`Ajoute au prix (${currencyLabel})`}
          type="number"
          defaultValue={String(option?.priceAdjustment ?? 0)}
          hint="Un montant négatif applique une remise."
          error={errors.priceAdjustment}
        />
        <Text
          id={`optduration-${suffix}`}
          name="durationAdjustment"
          label="Ajoute à la durée (min)"
          type="number"
          defaultValue={String(option?.durationAdjustment ?? 0)}
          error={errors.durationAdjustment}
        />
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" style={tinyButton} disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </button>
        <button type="button" className="btn btn-secondary" style={tinyButton} onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function Text({
  id,
  name,
  label,
  defaultValue,
  error,
  hint,
  type = "text",
  required,
}: {
  id: string;
  name?: string;
  label: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  type?: string;
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
        name={name ?? id}
        className="input"
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
      />
      {hint ? <p className="hint">{hint}</p> : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: "0 1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
};

const formBox: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--admin-accent)",
  borderRadius: 12,
  background: "var(--admin-subtle)",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: ".55rem",
  fontSize: ".92rem",
  cursor: "pointer",
  minHeight: 32,
};

const smallButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 36,
  fontSize: ".85rem",
};

const tinyButton: React.CSSProperties = {
  padding: ".3rem .7rem",
  minHeight: 32,
  fontSize: ".8rem",
};
