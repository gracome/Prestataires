"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * The portfolio (cahier des charges section 4, "montrer ses réalisations").
 *
 * Filters by category, and opens a full-size viewer on click. The viewer is a
 * real dialog: focus is trapped inside it, Escape closes it, and the arrow
 * keys move between photos, so it works without a mouse.
 */

export type PortfolioItem = {
  id: string;
  url: string;
  caption: string | null;
  category: string | null;
  serviceName: string | null;
  serviceSlug: string | null;
};

export function PortfolioGrid({
  items,
  categories,
  providerSlug,
}: {
  items: PortfolioItem[];
  categories: string[];
  providerSlug: string;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const visible = useMemo(
    () => (filter ? items.filter((item) => item.category === filter) : items),
    [items, filter],
  );

  const close = useCallback(() => {
    setOpenIndex(null);
    lastFocused.current?.focus();
  }, []);

  const move = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        const next = current + delta;
        if (next < 0 || next >= visible.length) return current;
        return next;
      });
    },
    [visible.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowLeft") move(-1);
      else if (event.key === "Tab") {
        // Keep focus inside the dialog while it is open.
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button, a[href]",
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, move]);

  // Kept together so TypeScript can see that a visible dialog always has an
  // index, and the "3 sur 12" counter below never has to guess.
  const opened =
    openIndex !== null && visible[openIndex]
      ? { index: openIndex, item: visible[openIndex] }
      : null;

  return (
    <div>
      {categories.length > 1 ? (
        <div
          role="group"
          aria-label="Filtrer par catégorie"
          style={{ display: "flex", gap: ".45rem", flexWrap: "wrap", marginBottom: "1.5rem" }}
        >
          <FilterChip active={filter === null} onClick={() => setFilter(null)}>
            Tout ({items.length})
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category}
              active={filter === category}
              onClick={() => setFilter(category)}
            >
              {category} ({items.filter((i) => i.category === category).length})
            </FilterChip>
          ))}
        </div>
      ) : null}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: ".7rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
        }}
      >
        {visible.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={(event) => {
                lastFocused.current = event.currentTarget;
                setOpenIndex(index);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: 0,
                border: "1px solid var(--brand-border)",
                borderRadius: 14,
                overflow: "hidden",
                background: "var(--brand-surface)",
                cursor: "zoom-in",
                font: "inherit",
                color: "inherit",
                textAlign: "left",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.caption ?? item.serviceName ?? "Réalisation"}
                loading="lazy"
                decoding="async"
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                }}
              />
              {item.caption || item.serviceName ? (
                <span
                  style={{
                    display: "block",
                    padding: ".6rem .75rem .7rem",
                    fontSize: ".82rem",
                    lineHeight: 1.45,
                  }}
                >
                  {item.caption ? <strong style={{ fontWeight: 600 }}>{item.caption}</strong> : null}
                  {item.serviceName ? (
                    <span style={{ display: "block", color: "var(--brand-muted)", marginTop: ".1rem" }}>
                      {item.serviceName}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p style={{ color: "var(--brand-muted)", marginTop: "1rem" }}>
          Aucune réalisation dans cette catégorie pour le moment.
        </p>
      ) : null}

      {opened ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={opened.item.caption ?? "Réalisation"}
          ref={dialogRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgb(20 16 15 / 88%)",
            display: "grid",
            placeItems: "center",
            padding: "max(1rem, env(safe-area-inset-top)) 1rem 1rem",
          }}
        >
          <div style={{ maxWidth: 900, width: "100%", maxHeight: "100%", display: "grid", gap: ".75rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: ".4rem" }}>
              <IconButton onClick={() => move(-1)} disabled={opened.index === 0} label="Photo précédente">
                ‹
              </IconButton>
              <IconButton
                onClick={() => move(1)}
                disabled={opened.index === visible.length - 1}
                label="Photo suivante"
              >
                ›
              </IconButton>
              <IconButton onClick={close} label="Fermer">
                ✕
              </IconButton>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opened.item.url}
              alt={opened.item.caption ?? opened.item.serviceName ?? "Réalisation"}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "70vh",
                margin: "0 auto",
                objectFit: "contain",
                borderRadius: 12,
              }}
            />

            <div style={{ color: "#fff", textAlign: "center", fontSize: ".9rem", lineHeight: 1.6 }}>
              {opened.item.caption ? <p style={{ margin: 0, fontWeight: 600 }}>{opened.item.caption}</p> : null}
              {opened.item.serviceSlug ? (
                <a
                  href={`/${providerSlug}/prestations/${opened.item.serviceSlug}`}
                  style={{ color: "#fff", opacity: 0.85 }}
                >
                  Voir la prestation : {opened.item.serviceName}
                </a>
              ) : null}
              <p style={{ margin: ".4rem 0 0", opacity: 0.6, fontSize: ".8rem" }}>
                {opened.index + 1} sur {visible.length}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
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
        padding: ".45rem .95rem",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--brand-primary)" : "var(--brand-border)"}`,
        background: active ? "var(--brand-primary)" : "var(--brand-surface)",
        color: active ? "#fff" : "var(--brand-text)",
        fontSize: ".85rem",
        fontWeight: 600,
        cursor: "pointer",
        font: "inherit",
        minHeight: 40,
      }}
    >
      {children}
    </button>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "1px solid rgb(255 255 255 / 25%)",
        background: "rgb(255 255 255 / 12%)",
        color: "#fff",
        fontSize: "1.3rem",
        lineHeight: 1,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <span aria-hidden="true">{children}</span>
      <span className="visually-hidden">{label}</span>
    </button>
  );
}
