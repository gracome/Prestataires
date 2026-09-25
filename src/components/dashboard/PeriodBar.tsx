"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The period control: the usual ranges as buttons, and a calendar for anything
 * else.
 *
 * The ranges stay visible because they are what gets used nine times out of
 * ten, and hiding them behind a menu costs a click every time. The last button
 * opens two date fields, for the fortnight or the single week that no preset
 * covers.
 */

export type Preset = { value: string; label: string; href: string };

export function PeriodBar({
  presets,
  active,
  label,
  from,
  to,
  basePath,
  exportHref,
}: {
  presets: Preset[];
  active: string;
  /** The period being read, written out. Shown on the date button when custom. */
  label: string;
  from: string;
  to: string;
  /** Where the custom range submits to. */
  basePath: string;
  /** When given, an export button is placed at the end of the bar. */
  exportHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const custom = active === "personnalise";

  // Clicking anywhere else, or pressing Escape, puts the panel away. Escape
  // hands focus back to the button so the keyboard does not lose its place.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="period-bar">
      <nav aria-label="Période" className="period-chips">
        {presets.map((preset) => (
          <Link
            key={preset.value}
            href={preset.href}
            aria-current={active === preset.value ? "page" : undefined}
            className="period-chip"
            data-selected={active === preset.value ? "true" : undefined}
          >
            {preset.label}
          </Link>
        ))}

        <div ref={rootRef} className="period-custom">
          <button
            ref={buttonRef}
            type="button"
            className="period-chip period-chip-button"
            data-selected={custom ? "true" : undefined}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            <svg
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2.5" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
            <span>{custom ? label : "Dates précises"}</span>
          </button>

          <div
            id={panelId}
            role="group"
            aria-label="Choisir des dates précises"
            className="period-panel"
            hidden={!open}
          >
            <form method="get" action={basePath}>
              <input type="hidden" name="periode" value="personnalise" />

              <div className="period-dates">
                <label>
                  <span>Du</span>
                  <input type="date" name="du" defaultValue={from} required />
                </label>
                <label>
                  <span>Au</span>
                  <input type="date" name="au" defaultValue={to} required />
                </label>
              </div>

              <button type="submit" className="btn btn-secondary btn-block">
                Appliquer
              </button>
            </form>
          </div>
        </div>
      </nav>

      {exportHref ? (
        <a href={exportHref} className="period-export" download>
          <svg
            viewBox="0 0 24 24"
            width={15}
            height={15}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4v11" />
            <path d="m8 11 4 4 4-4" />
            <path d="M5 19h14" />
          </svg>
          <span>Exporter en CSV</span>
        </a>
      ) : null}

      <style>{`
        .period-bar {
          display: flex;
          align-items: center;
          gap: .75rem;
          flex-wrap: wrap;
          margin-bottom: .9rem;
        }
        .period-chips {
          display: flex;
          gap: .35rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .period-chip {
          display: inline-flex;
          align-items: center;
          gap: .38rem;
          padding: .38rem .8rem;
          border-radius: 999px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          color: var(--admin-text);
          font-family: inherit;
          font-size: .82rem;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
        }
        .period-chip:hover { background: var(--admin-subtle); }
        .period-chip:focus-visible {
          outline: 2px solid var(--admin-accent);
          outline-offset: 2px;
        }
        .period-chip[data-selected="true"] {
          background: var(--admin-accent);
          border-color: var(--admin-accent);
          color: var(--admin-accent-fg);
        }
        .period-chip-button svg { opacity: .8; }

        .period-custom { position: relative; }
        .period-panel {
          position: absolute;
          top: calc(100% + .4rem);
          left: 0;
          z-index: 20;
          width: 262px;
          max-width: calc(100vw - 2rem);
          padding: .7rem;
          border-radius: 12px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          box-shadow: 0 12px 32px rgb(0 0 0 / 12%);
          text-align: left;
        }
        .period-dates {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: .45rem;
          margin-bottom: .55rem;
        }
        .period-dates label {
          display: grid;
          gap: .2rem;
          font-size: .74rem;
          font-weight: 600;
          color: var(--admin-muted);
        }
        .period-dates input {
          width: 100%;
          min-height: 38px;
          padding: .35rem .5rem;
          border-radius: 8px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          color: var(--admin-text);
          font-family: inherit;
          font-size: .84rem;
        }
        .period-dates input:focus-visible {
          outline: 2px solid var(--admin-accent);
          outline-offset: 1px;
        }

        .period-export {
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          margin-left: auto;
          font-size: .82rem;
          font-weight: 600;
          color: var(--admin-text);
          text-decoration: none;
          padding: .38rem .7rem;
          border-radius: 8px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          white-space: nowrap;
        }
        .period-export:hover { background: var(--admin-subtle); }
        /* On a phone the bar wraps, and pinning the export to the right would
           strand it on a line of its own. */
        @media (max-width: 640px) {
          .period-export { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
