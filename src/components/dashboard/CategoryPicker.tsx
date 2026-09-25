"use client";

import { useState, useTransition } from "react";
import { createCategoryInlineAction } from "@/app/dashboard/actions/catalogue";

/**
 * Category chooser with a create-in-place escape hatch.
 *
 * Writing a prestation is when the provider realises she needs a new grouping.
 * Sending her to another screen to create it, then back, loses whatever she had
 * already typed, so the category is created right here and selected at once.
 */

export type CategoryOption = { id: string; name: string };

export function CategoryPicker({
  name = "categoryId",
  label = "Catégorie",
  categories,
  defaultValue,
  hint,
}: {
  name?: string;
  label?: string;
  categories: CategoryOption[];
  defaultValue?: string;
  hint?: string;
}) {
  const [options, setOptions] = useState(categories);
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    const trimmed = draft.trim();
    if (trimmed.length < 2) {
      setError("Indiquez un nom d'au moins deux caractères.");
      return;
    }

    startTransition(async () => {
      const result = await createCategoryInlineAction(trimmed);

      if (result.status === "error" || !result.categoryId) {
        setError(result.status === "error" ? result.message : "Création impossible.");
        return;
      }

      // The action returns the existing row when the name is already taken,
      // so this covers both creating and picking.
      setOptions((current) =>
        current.some((option) => option.id === result.categoryId)
          ? current
          : [...current, { id: result.categoryId as string, name: trimmed }],
      );
      setSelected(result.categoryId);
      setDraft("");
      setError(null);
      setCreating(false);
    });
  }

  return (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}
      </label>

      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
        <select
          id={name}
          name={name}
          className="select"
          style={{ flex: "1 1 180px" }}
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">Sans catégorie</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        {!creating ? (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: ".5rem .9rem", minHeight: 46, fontSize: ".85rem" }}
            onClick={() => setCreating(true)}
          >
            Nouvelle catégorie
          </button>
        ) : null}
      </div>

      {creating ? (
        <div
          style={{
            marginTop: ".6rem",
            padding: ".85rem",
            border: "1px solid var(--admin-accent)",
            borderRadius: 12,
            background: "var(--admin-subtle)",
          }}
        >
          <label className="label" htmlFor={`${name}-new`}>
            Nom de la nouvelle catégorie
          </label>
          <input
            id={`${name}-new`}
            className="input"
            value={draft}
            maxLength={80}
            placeholder="Cils, Épilation, Coiffure…"
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              // Enter must not submit the prestation form from inside here.
              if (event.key === "Enter") {
                event.preventDefault();
                create();
              }
            }}
          />

          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: ".5rem", marginTop: ".6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={smallButton}
              disabled={pending}
              onClick={create}
            >
              {pending ? "Création…" : "Créer et sélectionner"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={smallButton}
              onClick={() => {
                setCreating(false);
                setDraft("");
                setError(null);
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

const smallButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 36,
  fontSize: ".85rem",
};
