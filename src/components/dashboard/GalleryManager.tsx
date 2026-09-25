"use client";

import { useActionState, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deleteGalleryImageAction,
  uploadGalleryImageAction,
} from "@/app/dashboard/actions/catalogue";
import { Feedback } from "./SettingsForms";

/**
 * The portfolio manager (cahier des charges section 4).
 *
 * A photo can be attached to a prestation, which makes it appear both in the
 * public portfolio and on that prestation's own page. That link is what turns
 * a gallery into a sales argument rather than decoration.
 */

export type GalleryRow = {
  id: string;
  url: string;
  caption: string | null;
  category: string | null;
  categoryId: string | null;
  categoryName: string | null;
  featured: boolean;
  serviceName: string | null;
};

export type GalleryServiceOption = { id: string; name: string };
export type GalleryCategoryOption = { id: string; name: string };

export function GalleryManager({
  images,
  services,
  categories,
}: {
  images: GalleryRow[];
  services: GalleryServiceOption[];
  categories: GalleryCategoryOption[];
}) {
  const [state, submit, pending] = useActionState(uploadGalleryImageAction, IDLE);
  const [removing, startRemoving] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);
  const [filter, setFilter] = useState<string | null>(null);

  const visible = filter
    ? images.filter((image) => image.categoryId === filter)
    : images;

  function remove(image: GalleryRow) {
    if (!window.confirm("Supprimer cette photo ?")) return;
    startRemoving(async () => {
      setFeedback(await deleteGalleryImageAction(image.id));
    });
  }

  return (
    <div>
      <form action={submit} className="card" style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 1rem", fontWeight: 700 }}>Ajouter une réalisation</p>

        <Feedback state={state} />

        <div className="field">
          <label className="label" htmlFor="image">
            Photo <span aria-hidden="true">*</span>
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="input"
            style={{ paddingBlock: ".55rem" }}
            required
          />
          <p className="hint">JPG, PNG, WEBP ou AVIF. 5 Mo maximum.</p>
        </div>

        <div style={twoColumns}>
          <div className="field">
            <label className="label" htmlFor="caption">
              Légende
            </label>
            <input id="caption" name="caption" className="input" maxLength={160} />
          </div>

          <div className="field">
            <label className="label" htmlFor="categoryId">
              Catégorie
            </label>
            <select id="categoryId" name="categoryId" className="select" defaultValue="">
              <option value="">Sans catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="hint">
              Même liste que vos prestations. Elle sert de filtre sur la page
              Réalisations.
            </p>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="serviceId">
            Prestation concernée
          </label>
          <select id="serviceId" name="serviceId" className="select" defaultValue="">
            <option value="">Aucune en particulier</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <p className="hint">
            La photo apparaîtra aussi sur la fiche de cette prestation, avec un lien
            pour la réserver.
          </p>
        </div>

        <div className="field">
          <label style={checkboxLabel}>
            <input type="checkbox" name="featured" />
            <span>Mettre en avant sur la page d&apos;accueil</span>
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Envoi…" : "Ajouter à la vitrine"}
        </button>
      </form>

      <Feedback state={feedback} />

      {categories.length > 1 ? (
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <Chip active={filter === null} onClick={() => setFilter(null)}>
            Tout ({images.length})
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              active={filter === category.id}
              onClick={() => setFilter(category.id)}
            >
              {category.name} ({images.filter((i) => i.categoryId === category.id).length})
            </Chip>
          ))}
        </div>
      ) : null}

      {images.length === 0 ? (
        <p style={{ color: "var(--admin-muted)", fontSize: ".9rem", lineHeight: 1.7 }}>
          Votre vitrine est vide. Les photos de vos réalisations sont souvent ce
          qui décide une nouvelle cliente : ajoutez-en quelques-unes, et
          rattachez-les aux prestations correspondantes.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: ".7rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))",
          }}
        >
          {visible.map((image) => (
            <li key={image.id} className="card" style={{ padding: ".55rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.caption ?? ""}
                loading="lazy"
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  borderRadius: 8,
                  display: "block",
                }}
              />

              <div style={{ marginTop: ".5rem", minHeight: 34 }}>
                {image.caption ? (
                  <p style={{ margin: 0, fontSize: ".82rem", lineHeight: 1.4, fontWeight: 600 }}>
                    {image.caption}
                  </p>
                ) : null}
                {image.categoryName || image.serviceName ? (
                  <p style={{ margin: ".15rem 0 0", fontSize: ".76rem", color: "var(--admin-muted)" }}>
                    {[image.categoryName, image.serviceName].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {image.featured ? (
                  <span className="pill pill-success" style={{ marginTop: ".3rem" }}>
                    En avant
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  marginTop: ".5rem",
                  width: "100%",
                  padding: ".35rem",
                  minHeight: 34,
                  fontSize: ".8rem",
                  color: "var(--tone-danger-fg)",
                }}
                disabled={removing}
                onClick={() => remove(image)}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: ".35rem .8rem",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--admin-accent)" : "var(--admin-border)"}`,
        background: active ? "var(--admin-accent)" : "var(--admin-surface)",
        color: active ? "#fff" : "var(--admin-text)",
        fontSize: ".82rem",
        fontWeight: 600,
        cursor: "pointer",
        font: "inherit",
        minHeight: 36,
      }}
    >
      {children}
    </button>
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
  cursor: "pointer",
  minHeight: 32,
};
