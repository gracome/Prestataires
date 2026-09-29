"use client";

import { useActionState, useState } from "react";
import { updatePageLayoutAction } from "@/app/dashboard/actions/settings";
import {
  LAYOUTS,
  SECTIONS,
  resolveSectionOrder,
  type LayoutVariant,
  type SectionKey,
} from "@/lib/site/sections";
import type { ActionState } from "@/lib/validation";

/**
 * Deciding what the home page shows, and in which order.
 *
 * Moving a section is two buttons rather than drag and drop. Dragging needs a
 * pointer, a steady hand and a library; a provider reordering her page from a
 * phone between two customers has none of the three, and up and down work the
 * same for the keyboard and for a screen reader.
 *
 * The order travels as one hidden field. It means the whole list is saved
 * together, so a half-applied reorder cannot exist.
 */

const IDLE: ActionState = { status: "idle" };

export type PageLayoutValues = {
  sectionOrder: string[];
  layoutVariant: string;
  visibility: Record<string, boolean>;
};

export function PageLayoutForm({ values }: { values: PageLayoutValues }) {
  const [state, action, pending] = useActionState(updatePageLayoutAction, IDLE);
  const [order, setOrder] = useState<SectionKey[]>(() =>
    resolveSectionOrder(values.sectionOrder),
  );
  const [layout, setLayout] = useState<LayoutVariant>(
    () =>
      (LAYOUTS.find((l) => l.value === values.layoutVariant)?.value ?? "classic"),
  );

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const definition = (key: SectionKey) =>
    SECTIONS.find((section) => section.key === key)!;

  return (
    <form action={action}>
      <input type="hidden" name="sectionOrder" value={order.join(",")} />
      <input type="hidden" name="layoutVariant" value={layout} />

      <fieldset className="card" style={{ border: 0, margin: 0, padding: "1rem" }}>
        <legend style={{ fontWeight: 700, fontSize: ".95rem", padding: "0 .3rem" }}>
          Allure générale
        </legend>
        <p
          style={{
            margin: ".2rem 0 .9rem",
            fontSize: ".85rem",
            color: "var(--admin-muted)",
            lineHeight: 1.6,
          }}
        >
          Change la forme de votre page d&apos;accueil : la taille des titres,
          la hauteur de la photo, l&apos;alignement du texte.
        </p>

        <div className="pl-layouts">
          {LAYOUTS.map((option) => (
            <label
              key={option.value}
              className="pl-layout"
              data-selected={layout === option.value ? "true" : undefined}
            >
              <input
                type="radio"
                name="layoutChoice"
                value={option.value}
                checked={layout === option.value}
                onChange={() => setLayout(option.value)}
                className="visually-hidden"
              />
              <span aria-hidden="true" className={`pl-preview pl-preview-${option.value}`}>
                <span />
                <span />
                <span />
              </span>
              <span className="pl-layout-name">{option.label}</span>
              <span className="pl-layout-hint">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div style={{ marginTop: "1rem" }} className="card">
        <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700 }}>
          Vos sections
        </h3>
        <p
          style={{
            margin: ".25rem 0 1rem",
            fontSize: ".85rem",
            color: "var(--admin-muted)",
            lineHeight: 1.6,
          }}
        >
          Décochez ce que vous ne voulez pas montrer, et remontez ce qui compte
          le plus. La photo d&apos;accueil reste toujours en haut.
        </p>

        <ol className="pl-list">
          {order.map((key, index) => {
            const section = definition(key);
            const togglable = Boolean(section.toggle);

            return (
              <li key={key} className="pl-item">
                <span className="pl-rank" aria-hidden="true">
                  {index + 1}
                </span>

                <span className="pl-body">
                  <span className="pl-name">
                    {togglable ? (
                      <label style={{ display: "inline-flex", gap: ".45rem", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          name={section.toggle}
                          defaultChecked={values.visibility[section.toggle!] !== false}
                        />
                        {section.label}
                      </label>
                    ) : (
                      <>
                        {section.label}
                        <span className="pl-always">toujours affichée</span>
                      </>
                    )}
                  </span>
                  <span className="pl-hint">{section.hint}</span>
                </span>

                <span className="pl-moves">
                  <button
                    type="button"
                    className="btn btn-ghost pl-move"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Monter ${section.label}`}
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost pl-move"
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    aria-label={`Descendre ${section.label}`}
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </span>
              </li>
            );
          })}
        </ol>

        <div
          style={{
            display: "flex",
            gap: ".8rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: "1.1rem",
          }}
        >
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer la mise en page"}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOrder(resolveSectionOrder([]))}
          >
            Remettre l&apos;ordre d&apos;origine
          </button>

          {state.status !== "idle" && state.message ? (
            <span
              style={{
                fontSize: ".86rem",
                color:
                  state.status === "success"
                    ? "var(--tone-success-fg)"
                    : "var(--tone-danger-fg)",
              }}
            >
              {state.message}
            </span>
          ) : null}
        </div>
      </div>

      <style>{`
        .pl-layouts {
          display: grid;
          gap: .6rem;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        }
        .pl-layout {
          display: grid;
          gap: .35rem;
          padding: .75rem;
          border-radius: 10px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          cursor: pointer;
        }
        .pl-layout:hover { border-color: var(--admin-muted); }
        .pl-layout[data-selected="true"] {
          border-color: var(--admin-accent);
          background: color-mix(in srgb, var(--admin-accent) 9%, var(--admin-surface));
        }
        .pl-layout:focus-within {
          outline: 2px solid var(--admin-accent);
          outline-offset: 2px;
        }
        .pl-layout-name { font-weight: 700; font-size: .88rem; }
        .pl-layout-hint { font-size: .76rem; color: var(--admin-muted); line-height: 1.45; }

        /* A three-bar sketch of what each layout does to the titles. */
        .pl-preview {
          display: grid;
          gap: 4px;
          padding: .55rem;
          border-radius: 7px;
          background: var(--admin-subtle);
          margin-bottom: .2rem;
        }
        .pl-preview span {
          display: block;
          height: 5px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--admin-text) 28%, transparent);
        }
        .pl-preview-classic { justify-items: center; }
        .pl-preview-classic span:nth-child(1) { width: 40%; }
        .pl-preview-classic span:nth-child(2) { width: 72%; height: 9px; }
        .pl-preview-classic span:nth-child(3) { width: 56%; }
        .pl-preview-editorial { justify-items: start; }
        .pl-preview-editorial span:nth-child(1) { width: 30%; }
        .pl-preview-editorial span:nth-child(2) { width: 92%; height: 12px; }
        .pl-preview-editorial span:nth-child(3) { width: 62%; }
        .pl-preview-minimal { justify-items: start; gap: 7px; }
        .pl-preview-minimal span:nth-child(1) { width: 22%; }
        .pl-preview-minimal span:nth-child(2) { width: 48%; height: 6px; }
        .pl-preview-minimal span:nth-child(3) { width: 34%; }

        .pl-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: .3rem;
          counter-reset: none;
        }
        .pl-item {
          display: flex;
          gap: .75rem;
          align-items: center;
          padding: .6rem .5rem;
          border-radius: 9px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
        }
        .pl-rank {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: var(--admin-subtle);
          font-size: .74rem;
          font-weight: 700;
          color: var(--admin-muted);
        }
        .pl-body { flex: 1; min-width: 0; }
        .pl-name { display: block; font-weight: 600; font-size: .9rem; }
        .pl-always {
          margin-left: .45rem;
          font-size: .7rem;
          font-weight: 500;
          color: var(--admin-muted);
        }
        .pl-hint {
          display: block;
          margin-top: .15rem;
          font-size: .78rem;
          color: var(--admin-muted);
          line-height: 1.5;
        }
        .pl-moves { display: flex; gap: .15rem; flex-shrink: 0; }
        .pl-move {
          min-height: 38px;
          min-width: 38px;
          padding: 0;
          font-size: 1rem;
        }
        .pl-move:disabled { opacity: .3; cursor: not-allowed; }
      `}</style>
    </form>
  );
}
