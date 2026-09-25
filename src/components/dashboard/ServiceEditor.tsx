"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deleteServiceStepAction,
  reorderServiceStepAction,
  saveServiceAction,
  saveServiceStepAction,
} from "@/app/dashboard/actions/catalogue";
import { Feedback } from "./SettingsForms";
import { CategoryPicker } from "./CategoryPicker";

/**
 * The full prestation editor.
 *
 * The showcase fields carry the public page: a plain sentence for people who
 * do not know the trade name, who it suits, what is included, and the
 * step-by-step procedure that turns a price line into something a first-time
 * customer can picture.
 */

export type ServiceEditorValues = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  imageUrl: string;
  price: number;
  priceType: "FIXED" | "STARTING_FROM" | "QUOTE_ONLY";
  durationMinutes: number;
  bufferAfterMinutes: number;
  depositRequired: boolean;
  depositType: "NONE" | "FIXED" | "PERCENTAGE";
  depositValue: number;
  active: boolean;
  popular: boolean;
  idealFor: string;
  included: string;
  preparation: string;
  aftercare: string;
};

export type StepRow = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  imageUrl: string | null;
};

export type { CategoryOption } from "./CategoryPicker";
type CategoryOptionLocal = { id: string; name: string };

export function ServiceEditor({
  service,
  steps,
  categories,
  currencyLabel,
}: {
  service: ServiceEditorValues;
  steps: StepRow[];
  categories: CategoryOptionLocal[];
  currencyLabel: string;
}) {
  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <MainForm service={service} categories={categories} currencyLabel={currencyLabel} />
      <StepsEditor serviceId={service.id} steps={steps} />
    </div>
  );
}

function MainForm({
  service,
  categories,
  currencyLabel,
}: {
  service: ServiceEditorValues;
  categories: CategoryOptionLocal[];
  currencyLabel: string;
}) {
  const action = async (previous: ActionState, formData: FormData) =>
    saveServiceAction(service.id, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  const [depositRequired, setDepositRequired] = useState(service.depositRequired);
  const [depositType, setDepositType] = useState<"FIXED" | "PERCENTAGE">(
    service.depositType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
  );
  const [imageUrl, setImageUrl] = useState(service.imageUrl);

  return (
    <form action={submit} noValidate style={{ display: "grid", gap: "1.25rem" }}>
      <Feedback state={state} />

      <section className="card">
        <SectionTitle
          title="L'essentiel"
          hint="Ce qui décide du créneau réservé et du montant demandé."
        />

        <Text id="name" label="Nom" defaultValue={service.name} error={errors.name} required />

        <div style={twoColumns}>
          <Text
            id="durationMinutes"
            label="Durée en minutes"
            type="number"
            defaultValue={String(service.durationMinutes)}
            error={errors.durationMinutes}
            required
          />
          <Text
            id="bufferAfterMinutes"
            label="Battement après (minutes)"
            type="number"
            defaultValue={String(service.bufferAfterMinutes)}
            hint="Temps de remise en état réservé après la prestation."
            error={errors.bufferAfterMinutes}
          />
        </div>

        <div style={twoColumns}>
          <div className="field">
            <label className="label" htmlFor="priceType">
              Type de prix
            </label>
            <select
              id="priceType"
              name="priceType"
              className="select"
              defaultValue={service.priceType}
            >
              <option value="FIXED">Prix fixe</option>
              <option value="STARTING_FROM">À partir de</option>
              <option value="QUOTE_ONLY">Sur devis uniquement</option>
            </select>
            <p className="hint">Une prestation sur devis n&apos;est pas réservable en ligne.</p>
          </div>
          <Text
            id="price"
            label={`Prix en ${currencyLabel}`}
            type="number"
            defaultValue={String(service.price)}
            error={errors.price}
          />
        </div>

        <CategoryPicker
          categories={categories}
          defaultValue={service.categoryId}
          hint="Regroupe les prestations sur votre site. La même liste sert à classer vos photos."
        />
        <div className="field">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              name="depositRequired"
              checked={depositRequired}
              onChange={(event) => setDepositRequired(event.target.checked)}
            />
            <span>Demander un acompte pour cette prestation</span>
          </label>
        </div>

        {depositRequired ? (
          <div style={twoColumns}>
            <div className="field">
              <label className="label" htmlFor="depositType">
                Type d&apos;acompte
              </label>
              <select
                id="depositType"
                name="depositType"
                className="select"
                value={depositType}
                onChange={(event) =>
                  setDepositType(event.target.value as "FIXED" | "PERCENTAGE")
                }
              >
                <option value="FIXED">Montant fixe</option>
                <option value="PERCENTAGE">Pourcentage du prix</option>
              </select>
              {errors.depositType ? (
                <p className="error-text" role="alert">
                  {errors.depositType}
                </p>
              ) : null}
            </div>
            <Text
              id="depositValue"
              label={
                depositType === "PERCENTAGE" ? "Pourcentage (%)" : `Montant en ${currencyLabel}`
              }
              type="number"
              defaultValue={String(service.depositValue)}
              error={errors.depositValue}
            />
          </div>
        ) : (
          <input type="hidden" name="depositType" value="NONE" />
        )}

        <div className="field">
          <label style={checkboxLabel}>
            <input type="checkbox" name="active" defaultChecked={service.active} />
            <span>Visible et réservable sur le site</span>
          </label>
        </div>

        <div className="field">
          <label style={checkboxLabel}>
            <input type="checkbox" name="popular" defaultChecked={service.popular} />
            <span>Mettre en avant dans le catalogue</span>
          </label>
        </div>
      </section>

      <section className="card">
        <SectionTitle
          title="La fiche publique"
          hint="Écrit pour une cliente qui ne connaît pas le vocabulaire du métier."
        />

        <div className="field">
          <label className="label" htmlFor="imageUrl">
            Photo principale
          </label>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              style={{
                display: "block",
                width: "100%",
                maxWidth: 260,
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: 12,
                marginBottom: ".6rem",
                border: "1px solid var(--admin-border)",
              }}
            />
          ) : null}
          <input
            id="imageUrl"
            name="imageUrl"
            className="input"
            type="url"
            value={imageUrl}
            placeholder="https://…"
            onChange={(event) => setImageUrl(event.target.value)}
          />
          <p className="hint">
            Collez le lien d&apos;une photo. Pour téléverser vos propres photos,
            utilisez la galerie puis copiez le lien de l&apos;image.
          </p>
          {errors.imageUrl ? (
            <p className="error-text" role="alert">
              {errors.imageUrl}
            </p>
          ) : null}
        </div>

        <Text
          id="shortDescription"
          label="En une phrase"
          defaultValue={service.shortDescription}
          hint="Affiché sous le nom dans le catalogue. Exemple : « Des ongles longs et solides qui tiennent trois à quatre semaines. »"
          error={errors.shortDescription}
        />

        <Area
          id="description"
          label="En quoi ça consiste"
          defaultValue={service.description}
          hint="Deux ou trois paragraphes. Laissez une ligne vide entre chaque."
          rows={5}
        />

        <Area
          id="idealFor"
          label="Idéal pour vous si"
          defaultValue={service.idealFor}
          hint="Un point par ligne. Exemple : « Vous voulez de la longueur sans faire pousser vos ongles. »"
        />

        <Area
          id="included"
          label="Ce qui est compris"
          defaultValue={service.included}
          hint="Un point par ligne : dépose, limage, couleur, finition…"
        />

        <Area
          id="preparation"
          label="Comment se préparer"
          defaultValue={service.preparation}
          hint="Un point par ligne. Ce que la cliente doit faire avant de venir."
        />

        <Area
          id="aftercare"
          label="Après la prestation"
          defaultValue={service.aftercare}
          hint="Un point par ligne. Comment entretenir le résultat."
        />
      </section>

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la fiche"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function StepsEditor({ serviceId, steps }: { serviceId: string; steps: StepRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  return (
    <section className="card">
      <SectionTitle
        title="Le déroulé, étape par étape"
        hint="C'est ce qui rassure le plus une nouvelle cliente : elle sait exactement ce qui va se passer."
      />

      <Feedback state={feedback} />

      {steps.length === 0 && editing !== "new" ? (
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
          Aucune étape décrite. La section n&apos;apparaîtra pas sur la fiche
          publique tant qu&apos;il n&apos;y en a pas.
        </p>
      ) : null}

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".6rem" }}>
        {steps.map((step, index) => (
          <li key={step.id}>
            {editing === step.id ? (
              <StepForm
                serviceId={serviceId}
                step={step}
                onDone={() => setEditing(null)}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: ".9rem",
                  alignItems: "flex-start",
                  padding: ".85rem 1rem",
                  border: "1px solid var(--admin-border)",
                  borderRadius: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "color-mix(in srgb, var(--admin-accent) 16%, transparent)",
                    color: "var(--admin-accent)",
                    fontWeight: 700,
                    fontSize: ".9rem",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>

                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {step.title}
                    {step.durationMinutes ? (
                      <span style={{ color: "var(--admin-muted)", fontWeight: 400 }}>
                        {" "}
                        · {step.durationMinutes} min
                      </span>
                    ) : null}
                  </p>
                  {step.description ? (
                    <p
                      style={{
                        margin: ".3rem 0 0",
                        fontSize: ".86rem",
                        color: "var(--admin-muted)",
                        lineHeight: 1.6,
                      }}
                    >
                      {step.description}
                    </p>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={iconButton}
                    disabled={index === 0 || pending}
                    onClick={() =>
                      startTransition(async () => {
                        setFeedback(await reorderServiceStepAction(step.id, "up"));
                      })
                    }
                  >
                    <span aria-hidden="true">↑</span>
                    <span className="visually-hidden">Monter l&apos;étape</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={iconButton}
                    disabled={index === steps.length - 1 || pending}
                    onClick={() =>
                      startTransition(async () => {
                        setFeedback(await reorderServiceStepAction(step.id, "down"));
                      })
                    }
                  >
                    <span aria-hidden="true">↓</span>
                    <span className="visually-hidden">Descendre l&apos;étape</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={smallButton}
                    onClick={() => setEditing(step.id)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm("Supprimer cette étape ?")) return;
                      startTransition(async () => {
                        setFeedback(await deleteServiceStepAction(step.id));
                      });
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {editing === "new" ? (
        <div style={{ marginTop: ".6rem" }}>
          <StepForm serviceId={serviceId} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: steps.length > 0 ? "1rem" : 0 }}
          onClick={() => setEditing("new")}
        >
          Ajouter une étape
        </button>
      )}
    </section>
  );
}

function StepForm({
  serviceId,
  step,
  onDone,
}: {
  serviceId: string;
  step?: StepRow;
  onDone: () => void;
}) {
  const action = async (previous: ActionState, formData: FormData) =>
    saveServiceStepAction(serviceId, step?.id ?? null, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form
      action={submit}
      noValidate
      style={{
        padding: "1rem",
        border: "1px solid var(--admin-accent)",
        borderRadius: 12,
        background: "var(--admin-subtle)",
      }}
    >
      {state.status === "error" ? <Feedback state={state} /> : null}

      <Text
        id="title"
        label="Titre de l'étape"
        defaultValue={step?.title}
        error={errors.title}
        required
      />

      <Area
        id="description"
        label="Ce qui se passe"
        defaultValue={step?.description ?? ""}
        rows={3}
      />

      <div style={twoColumns}>
        <Text
          id="durationMinutes"
          label="Durée en minutes (facultatif)"
          type="number"
          defaultValue={step?.durationMinutes ? String(step.durationMinutes) : ""}
          error={errors.durationMinutes}
        />
        <Text
          id="imageUrl"
          label="Photo de l'étape (facultatif)"
          type="url"
          defaultValue={step?.imageUrl ?? ""}
          error={errors.imageUrl}
        />
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" style={smallButton} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer l'étape"}
        </button>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: "1.15rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{title}</h2>
      {hint ? (
        <p
          style={{
            margin: ".3rem 0 0",
            fontSize: ".86rem",
            color: "var(--admin-muted)",
            lineHeight: 1.6,
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Text({
  id,
  label,
  defaultValue,
  error,
  hint,
  type = "text",
  required,
}: {
  id: string;
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
        name={id}
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

function Area({
  id,
  label,
  defaultValue,
  hint,
  rows = 4,
}: {
  id: string;
  label: string;
  defaultValue: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        className="textarea"
        rows={rows}
        defaultValue={defaultValue}
        maxLength={4000}
      />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

const twoColumns: React.CSSProperties = {
  display: "grid",
  gap: "0 1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: ".55rem",
  fontSize: ".92rem",
  fontWeight: 500,
  cursor: "pointer",
  minHeight: 32,
};

const smallButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 36,
  fontSize: ".85rem",
};

const iconButton: React.CSSProperties = {
  padding: ".4rem .65rem",
  minHeight: 36,
  fontSize: ".9rem",
};
