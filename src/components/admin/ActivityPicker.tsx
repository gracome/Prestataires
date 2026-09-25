"use client";

import { useState } from "react";
import type { Activity } from "@/lib/platform/activities";

/**
 * Choosing the trade.
 *
 * The choice is what makes a new site look like its business instead of a
 * blank shell, so it shows what it will do: the palette appears as three
 * swatches, and the starter prestations are listed before anything is created.
 * The colours below stay editable, because a provider who already has her own
 * is not going to accept ours.
 */
export function ActivityPicker({ activities }: { activities: Activity[] }) {
  const [selected, setSelected] = useState(activities[0]?.id ?? "autre");
  const active = activities.find((item) => item.id === selected) ?? activities[0];

  return (
    <div>
      <p className="ap-label">Type d&apos;activité</p>

      <div className="ap-grid">
        {activities.map((activity) => (
          <label key={activity.id} className="ap-option" data-selected={activity.id === selected ? "true" : undefined}>
            <input
              type="radio"
              name="activity"
              value={activity.id}
              checked={activity.id === selected}
              onChange={() => setSelected(activity.id)}
              className="visually-hidden"
            />
            <span className="ap-swatches" aria-hidden="true">
              <span style={{ background: activity.palette.primaryColor }} />
              <span style={{ background: activity.palette.accentColor }} />
              <span style={{ background: activity.palette.backgroundColor }} />
            </span>
            <span className="ap-name">{activity.label}</span>
            <span className="ap-hint">{activity.hint}</span>
          </label>
        ))}
      </div>

      {active ? (
        <div className="ap-preview">
          <p className="ap-preview-title">Ce qui sera créé</p>

          {active.services.length === 0 ? (
            <p className="ap-preview-body">
              Aucune prestation de départ. Le catalogue sera vide, à remplir
              avec elle.
            </p>
          ) : (
            <>
              <p className="ap-preview-body">
                Catégories : {active.categories.join(", ")}.
              </p>
              <ul className="ap-list">
                {active.services.map((service) => (
                  <li key={service.name}>
                    {service.name}
                    <span>
                      {service.durationMinutes} min · {service.price.toLocaleString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="ap-preview-body">
                Les prix sont des exemples dans la devise choisie. Elle les
                modifie depuis son espace.
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="ap-colours">
        <p className="ap-label">Couleurs</p>
        <p className="ap-preview-body" style={{ marginTop: 0 }}>
          Laissez tel quel pour garder la palette du métier, ou saisissez les
          couleurs qu&apos;elle utilise déjà.
        </p>

        <div className="ap-colour-row">
          <ColourField
            key={`primary-${selected}`}
            name="primaryColor"
            label="Principale"
            value={active?.palette.primaryColor ?? "#4A5568"}
          />
          <ColourField
            key={`accent-${selected}`}
            name="accentColor"
            label="Accent"
            value={active?.palette.accentColor ?? "#C8A97E"}
          />
          <ColourField
            key={`background-${selected}`}
            name="backgroundColor"
            label="Fond"
            value={active?.palette.backgroundColor ?? "#F7F8FA"}
          />
        </div>
      </div>

      <style>{`
        .ap-label {
          margin: 0 0 .5rem;
          font-size: .8rem;
          font-weight: 700;
        }
        .ap-grid {
          display: grid;
          gap: .5rem;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        }
        .ap-option {
          display: grid;
          gap: .3rem;
          padding: .7rem .8rem;
          border-radius: 10px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          cursor: pointer;
        }
        .ap-option:hover { border-color: var(--admin-muted); }
        .ap-option[data-selected="true"] {
          border-color: var(--admin-accent);
          background: color-mix(in srgb, var(--admin-accent) 10%, var(--admin-surface));
        }
        .ap-option:focus-within {
          outline: 2px solid var(--admin-accent);
          outline-offset: 2px;
        }
        .ap-swatches { display: flex; gap: 4px; }
        .ap-swatches span {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid var(--admin-border);
        }
        .ap-name { font-weight: 700; font-size: .88rem; }
        .ap-hint { font-size: .76rem; color: var(--admin-muted); line-height: 1.45; }

        .ap-preview {
          margin-top: .9rem;
          padding: .8rem .9rem;
          border-radius: 10px;
          border: 1px dashed var(--admin-border);
        }
        .ap-preview-title {
          margin: 0 0 .4rem;
          font-size: .72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: var(--admin-muted);
        }
        .ap-preview-body {
          margin: .4rem 0 0;
          font-size: .82rem;
          color: var(--admin-muted);
          line-height: 1.6;
        }
        .ap-list {
          list-style: none;
          margin: .5rem 0 0;
          padding: 0;
          display: grid;
          gap: .25rem;
          font-size: .84rem;
        }
        .ap-list li { display: flex; justify-content: space-between; gap: 1rem; }
        .ap-list span { color: var(--admin-muted); white-space: nowrap; }

        .ap-colours { margin-top: 1.1rem; }
        .ap-colour-row {
          display: grid;
          gap: .6rem;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          margin-top: .5rem;
        }
      `}</style>
    </div>
  );
}

function ColourField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  const [colour, setColour] = useState(value);

  return (
    <label style={{ display: "grid", gap: ".3rem", fontSize: ".76rem", fontWeight: 600 }}>
      <span style={{ color: "var(--admin-muted)" }}>{label}</span>
      <span style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
        <input
          type="color"
          value={colour}
          onChange={(event) => setColour(event.target.value)}
          aria-label={`${label}, sélecteur`}
          style={{
            width: 38,
            height: 38,
            padding: 2,
            border: "1px solid var(--admin-border)",
            borderRadius: 8,
            background: "transparent",
            cursor: "pointer",
          }}
        />
        <input
          type="text"
          name={name}
          value={colour}
          onChange={(event) => setColour(event.target.value)}
          aria-label={`${label}, code couleur`}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 38,
            padding: ".35rem .5rem",
            borderRadius: 8,
            border: "1px solid var(--admin-border)",
            background: "var(--admin-surface)",
            color: "var(--admin-text)",
            fontFamily: "inherit",
            fontSize: ".82rem",
          }}
        />
      </span>
    </label>
  );
}
