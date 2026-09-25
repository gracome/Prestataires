"use client";

import { useActionState, useMemo, useState } from "react";
import { IDLE } from "@/lib/validation";
import { saveAdminThemeAction } from "@/app/dashboard/actions/settings";
import {
  ADMIN_PRESETS,
  ADMIN_RADII,
  BODY_FONTS,
  adminThemeStyle,
  contrastRatio,
  isDarkBackground,
  type AdminThemeLike,
} from "@/lib/theme";
import { Feedback } from "./SettingsForms";

/**
 * The provider chooses the look of her own workspace.
 *
 * She spends her days here, so nothing is forbidden. Contrast is measured and
 * reported rather than enforced, and the status pills swap to a matching set
 * automatically, because spotting a proof waiting for verification must keep
 * working on any background.
 */

export function AdminThemeForm({
  theme,
  siteColors,
}: {
  theme: AdminThemeLike;
  /** The public palette, previewed under the "Comme mon site" preset. */
  siteColors: Omit<AdminThemeLike, "adminPreset" | "adminFont" | "adminRadius">;
}) {
  const [state, submit, pending] = useActionState(saveAdminThemeAction, IDLE);

  const [preset, setPreset] = useState(theme.adminPreset);
  const [colors, setColors] = useState({
    adminBackground: theme.adminBackground,
    adminSurface: theme.adminSurface,
    adminText: theme.adminText,
    adminMuted: theme.adminMuted,
    adminBorder: theme.adminBorder,
    adminAccent: theme.adminAccent,
  });
  const [font, setFont] = useState(theme.adminFont);
  const [radius, setRadius] = useState(theme.adminRadius);

  // A preset previews its own colours; only "custom" uses the pickers.
  const effective = useMemo(() => {
    if (preset === "custom") return colors;
    if (preset === "site") return siteColors;
    return ADMIN_PRESETS[preset]?.colors ?? colors;
  }, [preset, colors, siteColors]);

  const previewStyle = adminThemeStyle({
    ...effective,
    adminPreset: preset,
    adminFont: font,
    adminRadius: radius,
  });

  const warnings = readabilityWarnings(effective);

  return (
    <form action={submit} noValidate>
      <div className="card">
        <Feedback state={state} />

        <fieldset style={{ border: 0, padding: 0, margin: "0 0 1.25rem" }}>
          <legend style={{ padding: 0, fontWeight: 700, marginBottom: ".6rem" }}>
            Ambiance
          </legend>

          <div
            style={{
              display: "grid",
              gap: ".5rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            }}
          >
            {Object.entries(ADMIN_PRESETS).map(([value, item]) => {
              const selected = preset === value;
              const swatch =
                value === "site"
                  ? siteColors
                  : (item.colors ?? colors);

              return (
                <label
                  key={value}
                  style={{
                    display: "flex",
                    gap: ".65rem",
                    alignItems: "flex-start",
                    padding: ".75rem .85rem",
                    borderRadius: 12,
                    border: `1px solid ${selected ? "var(--admin-accent)" : "var(--admin-border)"}`,
                    background: selected ? "var(--admin-subtle)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="adminPreset"
                    value={value}
                    checked={selected}
                    onChange={() => setPreset(value)}
                    style={{ marginTop: ".25rem", flexShrink: 0 }}
                  />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: ".4rem", fontWeight: 600 }}>
                      {item.label}
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          borderRadius: 999,
                          overflow: "hidden",
                          border: "1px solid var(--admin-border)",
                        }}
                      >
                        {[swatch.adminBackground, swatch.adminSurface, swatch.adminAccent].map(
                          (color, index) => (
                            <span
                              key={index}
                              style={{ width: 12, height: 12, background: color }}
                            />
                          ),
                        )}
                      </span>
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: ".8rem",
                        color: "var(--admin-muted)",
                        marginTop: ".2rem",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {preset === "custom" ? (
          <div style={grid}>
            <Color id="adminBackground" label="Fond de page" value={colors.adminBackground} onChange={(v) => setColors((c) => ({ ...c, adminBackground: v }))} />
            <Color id="adminSurface" label="Fond des cartes" value={colors.adminSurface} onChange={(v) => setColors((c) => ({ ...c, adminSurface: v }))} />
            <Color id="adminText" label="Texte" value={colors.adminText} onChange={(v) => setColors((c) => ({ ...c, adminText: v }))} />
            <Color id="adminMuted" label="Texte secondaire" value={colors.adminMuted} onChange={(v) => setColors((c) => ({ ...c, adminMuted: v }))} />
            <Color id="adminBorder" label="Bordures" value={colors.adminBorder} onChange={(v) => setColors((c) => ({ ...c, adminBorder: v }))} />
            <Color id="adminAccent" label="Couleur d'accent" value={colors.adminAccent} onChange={(v) => setColors((c) => ({ ...c, adminAccent: v }))} />
          </div>
        ) : (
          // The server resolves a preset itself, but the fields travel anyway
          // so switching back to "Personnalisé" keeps what she had picked.
          Object.entries(colors).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        )}

        <div style={grid}>
          <div className="field">
            <label className="label" htmlFor="adminFont">
              Police
            </label>
            <select
              id="adminFont"
              name="adminFont"
              className="select"
              value={font}
              onChange={(event) => setFont(event.target.value)}
            >
              {BODY_FONTS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="adminRadius">
              Arrondi des éléments
            </label>
            <select
              id="adminRadius"
              name="adminRadius"
              className="select"
              value={radius}
              onChange={(event) => setRadius(event.target.value)}
            >
              {ADMIN_RADII.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {warnings.length > 0 ? (
          <div
            role="status"
            style={{
              margin: "0 0 1rem",
              padding: ".8rem 1rem",
              borderRadius: 10,
              background: "var(--tone-warning-bg)",
              color: "var(--tone-warning-fg)",
              fontSize: ".86rem",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ fontWeight: 700 }}>Lisibilité</strong>
            <ul style={{ margin: ".35rem 0 0", paddingLeft: "1.1rem" }}>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <p style={{ margin: ".4rem 0 0" }}>
              Vous pouvez enregistrer quand même, c&apos;est votre espace.
            </p>
          </div>
        ) : null}

        <Preview style={previewStyle} dark={isDarkBackground(effective.adminBackground)} />

        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: "1.25rem" }}
          disabled={pending}
        >
          {pending ? "Enregistrement…" : "Appliquer à mon tableau de bord"}
        </button>
      </div>
    </form>
  );
}

/** A miniature of the dashboard, rendered with the palette being chosen. */
function Preview({ style, dark }: { style: React.CSSProperties; dark: boolean }) {
  return (
    <div>
      <p style={{ margin: "0 0 .5rem", fontWeight: 600, fontSize: ".9rem" }}>Aperçu</p>
      <div
        className="admin"
        style={{
          ...style,
          minHeight: 0,
          borderRadius: 14,
          border: "1px solid var(--admin-border)",
          overflow: "hidden",
          background: "var(--admin-bg)",
          color: "var(--admin-text)",
          display: "grid",
          gridTemplateColumns: "minmax(110px, 30%) 1fr",
        }}
      >
        <div
          style={{
            background: "var(--admin-surface)",
            borderRight: "1px solid var(--admin-border)",
            padding: ".75rem .65rem",
            fontSize: ".78rem",
          }}
        >
          <p style={{ margin: "0 0 .5rem", fontWeight: 700 }}>Menu</p>
          <p
            style={{
              margin: "0 0 .3rem",
              padding: ".3rem .45rem",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--admin-accent) 14%, transparent)",
              color: "var(--admin-accent)",
              fontWeight: 700,
            }}
          >
            Réservations
          </p>
          <p style={{ margin: 0, padding: ".3rem .45rem", color: "var(--admin-muted)" }}>
            Calendrier
          </p>
        </div>

        <div style={{ padding: ".85rem" }}>
          <div
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border)",
              borderRadius: "var(--admin-radius)",
              padding: ".7rem .8rem",
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem" }}>Fatou Bello</p>
            <p style={{ margin: ".15rem 0 .6rem", fontSize: ".76rem", color: "var(--admin-muted)" }}>
              Pose gel · jeudi 15h00
            </p>
            <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
              <span className="pill pill-action">À vérifier</span>
              <span className="pill pill-success">Confirmé</span>
              <span className="pill pill-danger">Refusé</span>
            </div>
            <div style={{ display: "flex", gap: ".4rem", marginTop: ".6rem", flexWrap: "wrap" }}>
              <span
                className="btn btn-primary"
                style={{ padding: ".3rem .7rem", minHeight: 30, fontSize: ".75rem" }}
              >
                Confirmer
              </span>
              <span
                className="btn btn-secondary"
                style={{ padding: ".3rem .7rem", minHeight: 30, fontSize: ".75rem" }}
              >
                Refuser
              </span>
            </div>
          </div>
        </div>
      </div>
      <p style={{ margin: ".5rem 0 0", fontSize: ".8rem", color: "var(--admin-muted)", lineHeight: 1.55 }}>
        Les couleurs de statut basculent automatiquement sur un jeu{" "}
        {dark ? "clair, adapté à un fond sombre" : "foncé, adapté à un fond clair"}.
      </p>
    </div>
  );
}

/** Pairs worth flagging, with the WCAG threshold each one fails. */
function readabilityWarnings(
  colors: Omit<AdminThemeLike, "adminPreset" | "adminFont" | "adminRadius">,
): string[] {
  const warnings: string[] = [];
  const round = (value: number) => value.toFixed(1).replace(".", ",");

  const body = contrastRatio(colors.adminText, colors.adminSurface);
  if (body < 4.5) {
    warnings.push(
      `Texte sur les cartes : contraste de ${round(body)} pour 1. En dessous de 4,5 la lecture fatigue.`,
    );
  }

  const muted = contrastRatio(colors.adminMuted, colors.adminSurface);
  if (muted < 3) {
    warnings.push(
      `Texte secondaire : contraste de ${round(muted)} pour 1. Les précisions seront difficiles à lire.`,
    );
  }

  const surfaceOnBackground = contrastRatio(colors.adminSurface, colors.adminBackground);
  if (surfaceOnBackground < 1.05) {
    warnings.push(
      "Fond des cartes et fond de page sont presque identiques : les blocs ne se distingueront plus.",
    );
  }

  return warnings;
}

function Color({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
        <input
          id={id}
          name={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: 46,
            height: 46,
            padding: 2,
            border: "1px solid var(--admin-border)",
            borderRadius: 10,
            background: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <input
          className="input"
          value={value.toUpperCase()}
          aria-label={`${label}, code hexadécimal`}
          onChange={(event) => onChange(event.target.value)}
          style={{ fontFamily: "ui-monospace, monospace", fontSize: ".9rem" }}
        />
      </div>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: "0 1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
};
