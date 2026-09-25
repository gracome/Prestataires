"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deleteServiceAction,
  reorderServiceAction,
  saveServiceAction,
} from "@/app/dashboard/actions/catalogue";
import { Feedback } from "./SettingsForms";
import { CategoryPicker } from "./CategoryPicker";

/**
 * The prestation list (cahier des charges section 5).
 *
 * Creating one here asks only for what a slot needs: name, duration, price and
 * deposit. Everything that makes the public page rich lives on the prestation's
 * own editor, so adding a prestation stays a thirty-second job.
 */

export type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
  popular: boolean;
  priceLabel: string;
  depositLabel: string | null;
  durationLabel: string;
  imageUrl: string | null;
  stepCount: number;
  photoCount: number;
  /** True when the public page would look bare. */
  incomplete: boolean;
};

export type CategoryOption = { id: string; name: string };

export function ServiceManager({
  services,
  categories,
  currencyLabel,
}: {
  services: ServiceRow[];
  categories: CategoryOption[];
  currencyLabel: string;
}) {
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  function remove(service: ServiceRow) {
    const confirmed = window.confirm(
      `Supprimer « ${service.name} » ? Si des réservations existent, la prestation sera simplement désactivée.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      setFeedback(await deleteServiceAction(service.id));
    });
  }

  function move(service: ServiceRow, direction: "up" | "down") {
    startTransition(async () => {
      await reorderServiceAction(service.id, direction);
    });
  }

  return (
    <div>
      <Feedback state={feedback} />

      {creating ? (
        <QuickCreateForm
          onDone={() => setCreating(false)}
          categories={categories}
          currencyLabel={currencyLabel}
        />
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginBottom: "1.25rem" }}
          onClick={() => setCreating(true)}
        >
          Ajouter une prestation
        </button>
      )}

      {services.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Aucune prestation</p>
          <p style={{ margin: ".5rem 0 0", color: "var(--admin-muted)", fontSize: ".9rem" }}>
            Ajoutez vos prestations pour ouvrir la réservation en ligne.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".75rem" }}>
          {services.map((service, index) => (
            <li key={service.id}>
              <div className="card" style={{ opacity: service.active ? 1 : 0.62 }}>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <Thumbnail url={service.imageUrl} name={service.name} />

                  <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        display: "flex",
                        gap: ".5rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <Link
                        href={`/dashboard/services/${service.id}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {service.name}
                      </Link>
                      {service.popular ? (
                        <span className="pill pill-success">Mise en avant</span>
                      ) : null}
                      {!service.active ? <span className="pill pill-neutral">Inactive</span> : null}
                    </p>

                    <p style={{ margin: ".3rem 0 0", fontSize: ".85rem", color: "var(--admin-muted)" }}>
                      {service.durationLabel} · {service.priceLabel}
                      {service.depositLabel ? ` · acompte ${service.depositLabel}` : ""}
                      {service.category ? ` · ${service.category}` : ""}
                    </p>

                    <p style={{ margin: ".3rem 0 0", fontSize: ".82rem", color: "var(--admin-muted)" }}>
                      {service.stepCount > 0
                        ? `${service.stepCount} étape${service.stepCount > 1 ? "s" : ""} décrite${service.stepCount > 1 ? "s" : ""}`
                        : "Aucune étape décrite"}
                      {" · "}
                      {service.photoCount > 0
                        ? `${service.photoCount} photo${service.photoCount > 1 ? "s" : ""}`
                        : "aucune photo"}
                    </p>

                    {service.incomplete ? (
                      <p
                        style={{
                          margin: ".5rem 0 0",
                          fontSize: ".82rem",
                          color: "var(--tone-warning-fg)",
                          background: "var(--tone-warning-bg)",
                          padding: ".4rem .6rem",
                          borderRadius: 8,
                          lineHeight: 1.5,
                        }}
                      >
                        Fiche incomplète : ajoutez une photo et le déroulé pour que vos
                        clientes comprennent la prestation.
                      </p>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: ".35rem",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={iconButton}
                      disabled={index === 0 || pending}
                      onClick={() => move(service, "up")}
                    >
                      <span aria-hidden="true">↑</span>
                      <span className="visually-hidden">Monter {service.name}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={iconButton}
                      disabled={index === services.length - 1 || pending}
                      onClick={() => move(service, "down")}
                    >
                      <span aria-hidden="true">↓</span>
                      <span className="visually-hidden">Descendre {service.name}</span>
                    </button>
                    <Link
                      href={`/dashboard/services/${service.id}`}
                      className="btn btn-secondary"
                      style={smallButton}
                    >
                      Modifier la fiche
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                      disabled={pending}
                      onClick={() => remove(service)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumbnail({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        style={{
          width: 74,
          height: 74,
          objectFit: "cover",
          borderRadius: 12,
          flexShrink: 0,
          border: "1px solid var(--admin-border)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: 74,
        height: 74,
        borderRadius: 12,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: "var(--admin-subtle)",
        color: "var(--admin-muted)",
        fontWeight: 600,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/** Minimal form: only what a bookable slot needs. */
function QuickCreateForm({
  onDone,
  categories,
  currencyLabel,
}: {
  onDone: () => void;
  categories: CategoryOption[];
  currencyLabel: string;
}) {
  const action = async (previous: ActionState, formData: FormData) =>
    saveServiceAction(null, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositType, setDepositType] = useState<"FIXED" | "PERCENTAGE">("FIXED");

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form action={submit} className="card" style={{ marginBottom: "1.25rem" }} noValidate>
      <p style={{ margin: "0 0 .35rem", fontWeight: 700 }}>Nouvelle prestation</p>
      <p style={{ margin: "0 0 1rem", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        L&apos;essentiel pour ouvrir la réservation. Vous compléterez la fiche
        publique juste après.
      </p>

      {state.status === "error" ? <Feedback state={state} /> : null}

      <Text id="name" label="Nom de la prestation" error={errors.name} required />

      <div style={twoColumns}>
        <Text
          id="durationMinutes"
          label="Durée en minutes"
          type="number"
          inputMode="numeric"
          defaultValue="60"
          error={errors.durationMinutes}
          required
        />
        <Text
          id="price"
          label={`Prix en ${currencyLabel}`}
          type="number"
          inputMode="numeric"
          defaultValue="0"
          error={errors.price}
        />
      </div>

      <CategoryPicker categories={categories} />

      <div className="field">
        <label style={checkboxLabel}>
          <input
            type="checkbox"
            name="depositRequired"
            checked={depositRequired}
            onChange={(event) => setDepositRequired(event.target.checked)}
          />
          <span>Demander un acompte</span>
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
              onChange={(event) => setDepositType(event.target.value as "FIXED" | "PERCENTAGE")}
            >
              <option value="FIXED">Montant fixe</option>
              <option value="PERCENTAGE">Pourcentage du prix</option>
            </select>
          </div>
          <Text
            id="depositValue"
            label={depositType === "PERCENTAGE" ? "Pourcentage (%)" : `Montant en ${currencyLabel}`}
            type="number"
            inputMode="numeric"
            error={errors.depositValue}
          />
        </div>
      ) : (
        <input type="hidden" name="depositType" value="NONE" />
      )}

      <input type="hidden" name="priceType" value="FIXED" />
      <input type="hidden" name="active" value="on" />

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Création…" : "Créer la prestation"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function Text({
  id,
  label,
  defaultValue,
  error,
  type = "text",
  inputMode,
  required,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  error?: string;
  type?: string;
  inputMode?: "text" | "numeric";
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
        defaultValue={defaultValue}
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
