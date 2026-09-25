"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deleteHighlightAction,
  saveHighlightAction,
} from "@/app/dashboard/actions/catalogue";
import { Feedback } from "./SettingsForms";

/**
 * Commitments and credentials.
 *
 * Commitments run as a strip under the hero: short promises that answer the
 * doubt a first-time customer has. Credentials sit in the about section and
 * back those promises with training.
 */

export type HighlightRow = {
  id: string;
  kind: "COMMITMENT" | "CREDENTIAL";
  title: string;
  description: string | null;
  meta: string | null;
};

const COPY = {
  COMMITMENT: {
    hint: "Affichés en bandeau juste sous la bannière d'accueil. Trois ou quatre suffisent : matériel stérilisé, pas de rendez-vous qui se chevauchent, retouche offerte sous huit jours.",
    add: "Ajouter un engagement",
    metaLabel: "Chiffre mis en avant (facultatif)",
    metaHint: "Exemple : 6 ans, 100 %, 48 h.",
    empty:
      "Aucun engagement. C'est pourtant ce qui rassure une cliente qui ne vous connaît pas encore.",
  },
  CREDENTIAL: {
    hint: "Listées dans la section à propos, avec l'année. Ce qui prouve que vous savez faire.",
    add: "Ajouter une formation",
    metaLabel: "Année (facultatif)",
    metaHint: "Exemple : 2019.",
    empty: "Aucune formation renseignée.",
  },
} as const;

export function HighlightManager({
  kind,
  items,
}: {
  kind: "COMMITMENT" | "CREDENTIAL";
  items: HighlightRow[];
}) {
  const copy = COPY[kind];
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  return (
    <div>
      <p style={helpText}>{copy.hint}</p>

      <Feedback state={feedback} />

      {items.length === 0 && editing !== "new" ? (
        <p style={{ color: "var(--admin-muted)", fontSize: ".9rem", marginBottom: "1rem" }}>
          {copy.empty}
        </p>
      ) : null}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".6rem" }}>
        {items.map((item) => (
          <li key={item.id}>
            {editing === item.id ? (
              <HighlightForm kind={kind} item={item} onDone={() => setEditing(null)} />
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
                {item.meta ? (
                  <span
                    style={{
                      color: "var(--admin-accent)",
                      fontWeight: 700,
                      fontSize: ".95rem",
                      flexShrink: 0,
                    }}
                  >
                    {item.meta}
                  </span>
                ) : null}

                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
                  {item.description ? (
                    <p
                      style={{
                        margin: ".25rem 0 0",
                        fontSize: ".86rem",
                        color: "var(--admin-muted)",
                        lineHeight: 1.6,
                      }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: ".3rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={smallButton}
                    onClick={() => setEditing(item.id)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm("Supprimer cet élément ?")) return;
                      startTransition(async () => {
                        setFeedback(await deleteHighlightAction(item.id));
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
      </ul>

      {editing === "new" ? (
        <div style={{ marginTop: ".6rem" }}>
          <HighlightForm kind={kind} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: items.length > 0 ? "1rem" : 0 }}
          onClick={() => setEditing("new")}
        >
          {copy.add}
        </button>
      )}
    </div>
  );
}

function HighlightForm({
  kind,
  item,
  onDone,
}: {
  kind: "COMMITMENT" | "CREDENTIAL";
  item?: HighlightRow;
  onDone: () => void;
}) {
  const copy = COPY[kind];
  const action = async (previous: ActionState, formData: FormData) =>
    saveHighlightAction(item?.id ?? null, previous, formData);

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

      <input type="hidden" name="kind" value={kind} />

      <div className="field">
        <label className="label" htmlFor={`title-${item?.id ?? "new"}`}>
          Intitulé <span aria-hidden="true">*</span>
        </label>
        <input
          id={`title-${item?.id ?? "new"}`}
          name="title"
          className="input"
          defaultValue={item?.title}
          required
          aria-invalid={errors.title ? true : undefined}
        />
        {errors.title ? (
          <p className="error-text" role="alert">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="label" htmlFor={`description-${item?.id ?? "new"}`}>
          Précision
        </label>
        <textarea
          id={`description-${item?.id ?? "new"}`}
          name="description"
          className="textarea"
          defaultValue={item?.description ?? ""}
          maxLength={400}
          style={{ minHeight: 70 }}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={`meta-${item?.id ?? "new"}`}>
          {copy.metaLabel}
        </label>
        <input
          id={`meta-${item?.id ?? "new"}`}
          name="meta"
          className="input"
          defaultValue={item?.meta ?? ""}
          maxLength={24}
        />
        <p className="hint">{copy.metaHint}</p>
        {errors.meta ? (
          <p className="error-text" role="alert">
            {errors.meta}
          </p>
        ) : null}
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

const helpText: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: ".86rem",
  color: "var(--admin-muted)",
  lineHeight: 1.6,
};

const smallButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 36,
  fontSize: ".85rem",
};
