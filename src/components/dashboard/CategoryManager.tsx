"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deleteServiceCategoryAction,
  reorderServiceCategoryAction,
  saveServiceCategoryAction,
  setServiceCategoryAction,
} from "@/app/dashboard/actions/catalogue";
import { Feedback } from "./SettingsForms";

/**
 * Categories group prestations on the public catalogue (cahier des charges
 * section 5).
 *
 * The order set here is the order of the headings on the site, so reordering
 * is part of the job, not a detail. Prestations can be moved between groups
 * from this screen rather than by opening each one.
 */

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  services: Array<{ id: string; name: string; active: boolean }>;
};

export function CategoryManager({
  categories,
  ungrouped,
}: {
  categories: CategoryRow[];
  ungrouped: Array<{ id: string; name: string; active: boolean }>;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  const options = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  function move(category: CategoryRow, direction: "up" | "down") {
    startTransition(async () => {
      setFeedback(await reorderServiceCategoryAction(category.id, direction));
    });
  }

  function remove(category: CategoryRow) {
    const count = category.services.length;
    const message =
      count > 0
        ? `Supprimer « ${category.name} » ? Les ${count} prestation${count > 1 ? "s" : ""} qu'elle contient ne seront pas supprimées, elles se retrouveront sans catégorie.`
        : `Supprimer « ${category.name} » ?`;

    if (!window.confirm(message)) return;

    startTransition(async () => {
      setFeedback(await deleteServiceCategoryAction(category.id));
    });
  }

  function assign(serviceId: string, categoryId: string | null) {
    startTransition(async () => {
      setFeedback(await setServiceCategoryAction(serviceId, categoryId));
    });
  }

  return (
    <div>
      <Feedback state={feedback} />

      {editing === "new" ? (
        <CategoryForm onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginBottom: "1.25rem" }}
          onClick={() => setEditing("new")}
        >
          Ajouter une catégorie
        </button>
      )}

      {categories.length === 0 ? (
        <p style={{ color: "var(--admin-muted)", fontSize: ".9rem", lineHeight: 1.7 }}>
          Aucune catégorie. Vos prestations s&apos;affichent alors en une seule
          liste. Créez-en quelques-unes si vous proposez des choses très
          différentes, par exemple « Ongles », « Pieds », « Cils ».
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".75rem" }}>
          {categories.map((category, index) => (
            <li key={category.id}>
              {editing === category.id ? (
                <CategoryForm category={category} onDone={() => setEditing(null)} />
              ) : (
                <div className="card" style={{ opacity: category.active ? 1 : 0.62 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: ".75rem",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        {category.name}
                        {!category.active ? (
                          <span className="pill pill-neutral" style={{ marginLeft: ".5rem" }}>
                            Masquée
                          </span>
                        ) : null}
                      </p>
                      <p style={{ margin: ".25rem 0 0", fontSize: ".84rem", color: "var(--admin-muted)" }}>
                        {category.services.length === 0
                          ? "Aucune prestation"
                          : `${category.services.length} prestation${category.services.length > 1 ? "s" : ""}`}
                        {category.description ? ` · ${category.description}` : ""}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={iconButton}
                        disabled={index === 0 || pending}
                        onClick={() => move(category, "up")}
                      >
                        <span aria-hidden="true">↑</span>
                        <span className="visually-hidden">Monter {category.name}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={iconButton}
                        disabled={index === categories.length - 1 || pending}
                        onClick={() => move(category, "down")}
                      >
                        <span aria-hidden="true">↓</span>
                        <span className="visually-hidden">Descendre {category.name}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={smallButton}
                        onClick={() => setEditing(category.id)}
                      >
                        Renommer
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                        disabled={pending}
                        onClick={() => remove(category)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {category.services.length > 0 ? (
                    <ul
                      style={{
                        listStyle: "none",
                        margin: ".9rem 0 0",
                        padding: ".75rem 0 0",
                        borderTop: "1px solid var(--admin-border)",
                        display: "grid",
                        gap: ".4rem",
                      }}
                    >
                      {category.services.map((service) => (
                        <ServiceRow
                          key={service.id}
                          service={service}
                          currentCategoryId={category.id}
                          options={options}
                          pending={pending}
                          onAssign={assign}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {ungrouped.length > 0 ? (
        <div className="card" style={{ marginTop: ".75rem", borderStyle: "dashed" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Sans catégorie</p>
          <p style={{ margin: ".25rem 0 .75rem", fontSize: ".84rem", color: "var(--admin-muted)" }}>
            Ces prestations s&apos;affichent en fin de catalogue, sans titre au-dessus.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".4rem" }}>
            {ungrouped.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                currentCategoryId={null}
                options={options}
                pending={pending}
                onAssign={assign}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ServiceRow({
  service,
  currentCategoryId,
  options,
  pending,
  onAssign,
}: {
  service: { id: string; name: string; active: boolean };
  currentCategoryId: string | null;
  options: Array<{ id: string; name: string }>;
  pending: boolean;
  onAssign: (serviceId: string, categoryId: string | null) => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        gap: ".6rem",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        fontSize: ".88rem",
      }}
    >
      <span style={{ minWidth: 0, opacity: service.active ? 1 : 0.6 }}>
        {service.name}
        {!service.active ? (
          <span style={{ color: "var(--admin-muted)" }}> · inactive</span>
        ) : null}
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        <label className="visually-hidden" htmlFor={`cat-${service.id}`}>
          Catégorie de {service.name}
        </label>
        <select
          id={`cat-${service.id}`}
          className="select"
          style={{ width: "auto", minHeight: 34, padding: ".25rem .6rem", fontSize: ".82rem" }}
          value={currentCategoryId ?? ""}
          disabled={pending}
          onChange={(event) => onAssign(service.id, event.target.value || null)}
        >
          <option value="">Sans catégorie</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </span>
    </li>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category?: CategoryRow;
  onDone: () => void;
}) {
  const action = async (previous: ActionState, formData: FormData) =>
    saveServiceCategoryAction(category?.id ?? null, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  const suffix = category?.id ?? "new";

  return (
    <form action={submit} className="card" style={{ marginBottom: "1.25rem" }} noValidate>
      <p style={{ margin: "0 0 1rem", fontWeight: 700 }}>
        {category ? "Renommer la catégorie" : "Nouvelle catégorie"}
      </p>

      {state.status === "error" ? <Feedback state={state} /> : null}

      <div className="field">
        <label className="label" htmlFor={`name-${suffix}`}>
          Nom <span aria-hidden="true">*</span>
        </label>
        <input
          id={`name-${suffix}`}
          name="name"
          className="input"
          defaultValue={category?.name}
          required
          placeholder="Ongles, Pieds, Cils…"
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name ? (
          <p className="error-text" role="alert">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="label" htmlFor={`description-${suffix}`}>
          Description (facultatif)
        </label>
        <input
          id={`description-${suffix}`}
          name="description"
          className="input"
          defaultValue={category?.description ?? ""}
          maxLength={400}
        />
        <p className="hint">Note interne, elle n&apos;apparaît pas sur le site.</p>
      </div>

      <div className="field">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".55rem",
            fontSize: ".92rem",
            cursor: "pointer",
            minHeight: 32,
          }}
        >
          <input type="checkbox" name="active" defaultChecked={category?.active ?? true} />
          <span>Afficher cette catégorie sur le site</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

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
