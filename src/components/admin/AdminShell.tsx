"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { logout } from "@/app/login/actions";
import { NavIcon, type IconName } from "@/components/dashboard/nav-icons";

/**
 * Chrome for the platform area.
 *
 * The content uses the same components and the same light palette as a
 * provider's workspace, because the platform owner deserves the same quality
 * of screen. The identity lives in the sidebar, which is dark and says
 * "Plateforme": whatever else is on the page, one glance at the left edge
 * answers whose data is on the table.
 */

type NavEntry = { href: string; label: string; icon: IconName };

const NAV: NavEntry[] = [
  { href: "/admin", label: "Vue d'ensemble", icon: "grid" },
  { href: "/admin/prestataires", label: "Prestataires", icon: "bookings" },
  { href: "/admin/prestataires/nouveau", label: "Créer une activité", icon: "tag" },
  { href: "/admin/journal", label: "Journal", icon: "quote" },
];

const STORAGE_KEY = "platform-nav";

/** Restores the folded rail before the first paint, so it never flashes wide. */
const RESTORE_SCRIPT = `try{var v=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(v==="collapsed"||v==="expanded")document.documentElement.dataset.platformNav=v}catch(e){}`;

function NavLabel({ label, icon }: { label: string; icon: IconName }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <NavIcon name={icon} className="pf-icon" />
      <span className="pf-text">{label}</span>
      {pending ? (
        <span className="pf-spinner" role="status">
          <span className="visually-hidden">Ouverture de {label}…</span>
        </span>
      ) : null}
    </>
  );
}

export function AdminShell({
  children,
  adminName,
  adminEmail,
  themeStyle,
}: {
  children: React.ReactNode;
  adminName: string;
  adminEmail: string;
  /** The platform palette, as custom properties for the content area. */
  themeStyle: CSSProperties;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setCollapsed(document.documentElement.dataset.platformNav === "collapsed");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      const value = next ? "collapsed" : "expanded";
      document.documentElement.dataset.platformNav = value;
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // Blocked storage: the rail still folds, it just is not remembered.
      }
      return next;
    });
  }, []);

  return (
    <div className="admin pf" style={themeStyle}>
      <script dangerouslySetInnerHTML={{ __html: RESTORE_SCRIPT }} />

      <a href="#pf-main" className="skip-link">
        Aller au contenu
      </a>

      <div className="pf-grid">
        <header className="pf-topbar">
          <button
            type="button"
            className="pf-burger"
            aria-expanded={menuOpen}
            aria-controls="pf-nav"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
            <span className="visually-hidden">Menu</span>
          </button>
          <span className="pf-brand">Plateforme</span>
        </header>

        <nav
          id="pf-nav"
          className={`pf-nav${menuOpen ? " is-open" : ""}`}
          aria-label="Navigation de la plateforme"
        >
          <div className="pf-nav-head">
            <span className="pf-brand pf-text">Plateforme</span>
            <button
              type="button"
              className="pf-toggle"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-controls="pf-nav"
              title={collapsed ? "Déplier le menu" : "Replier le menu"}
            >
              <NavIcon name={collapsed ? "chevron-right" : "chevron-left"} size={18} />
              <span className="visually-hidden">
                {collapsed ? "Déplier le menu" : "Replier le menu"}
              </span>
            </button>
          </div>

          <ul className="pf-list">
            {NAV.map((entry) => {
              const active =
                entry.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(entry.href);

              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    className="pf-link"
                    data-active={active ? "true" : undefined}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? entry.label : undefined}
                  >
                    <NavLabel label={entry.label} icon={entry.icon} />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="pf-foot">
            <div className="pf-who pf-text">
              <p>{adminName}</p>
              <p>{adminEmail}</p>
            </div>
            <form action={logout}>
              <button type="submit" className="pf-logout">
                <NavIcon name="logout" size={17} />
                <span className="pf-text">Se déconnecter</span>
              </button>
            </form>
          </div>
        </nav>

        {menuOpen ? (
          <button
            type="button"
            className="pf-scrim"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <main id="pf-main" className="pf-main">
          {children}
        </main>
      </div>

      <style>{`
        .pf {
          --pf-bg: #14171d;
          --pf-surface: #1b1f27;
          --pf-border: #2b313c;
          --pf-text: #e8ecf3;
          --pf-muted: #98a1b0;
          --pf-accent: #7cb2ff;
        }
        .pf-grid {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
          grid-template-areas: "topbar" "main";
          background: var(--admin-bg);
        }
        .pf-topbar {
          grid-area: topbar;
          display: flex;
          align-items: center;
          gap: .75rem;
          padding: .6rem 1rem;
          background: var(--pf-bg);
          color: var(--pf-text);
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .pf-burger {
          display: inline-flex;
          padding: .35rem .6rem;
          border-radius: 8px;
          border: 1px solid var(--pf-border);
          background: transparent;
          color: inherit;
          font-size: 1rem;
          cursor: pointer;
        }
        .pf-brand { font-weight: 700; letter-spacing: .01em; white-space: nowrap; }
        .pf-brand::before {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-right: .5rem;
          border-radius: 50%;
          background: var(--pf-accent);
          vertical-align: middle;
        }

        .pf-nav {
          position: fixed;
          inset: 0 auto 0 0;
          width: min(82vw, 272px);
          background: var(--pf-bg);
          color: var(--pf-text);
          transform: translateX(-100%);
          transition: transform .2s ease;
          z-index: 50;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .pf-nav::-webkit-scrollbar { width: 0; height: 0; }
        .pf-nav.is-open { transform: translateX(0); }
        .pf-nav-head {
          position: relative;
          display: flex;
          align-items: center;
          gap: .5rem;
          padding: 1.1rem .95rem;
          border-bottom: 1px solid var(--pf-border);
        }
        .pf-list {
          list-style: none;
          margin: 0;
          padding: .6rem .5rem;
          display: grid;
          gap: .15rem;
        }
        .pf-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: .65rem;
          padding: .6rem .7rem;
          border-radius: 9px;
          font-size: .88rem;
          font-weight: 600;
          text-decoration: none;
          color: var(--pf-muted);
          min-height: 42px;
        }
        .pf-icon { flex-shrink: 0; }
        .pf-text { flex: 1; min-width: 0; }
        .pf-link:hover { background: rgb(255 255 255 / 6%); color: var(--pf-text); }
        .pf-link[data-active="true"] {
          background: color-mix(in srgb, var(--pf-accent) 16%, transparent);
          color: var(--pf-accent);
        }
        .pf-spinner {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 2px solid color-mix(in srgb, var(--pf-accent) 30%, transparent);
          border-top-color: var(--pf-accent);
          animation: pf-spin .6s linear infinite;
        }
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .pf-spinner { animation-duration: 2s; } }

        .pf-foot {
          margin-top: auto;
          padding: .75rem .75rem 1.1rem;
          border-top: 1px solid var(--pf-border);
          display: grid;
          gap: .6rem;
        }
        .pf-who p { margin: 0; font-size: .82rem; }
        .pf-who p + p { color: var(--pf-muted); font-size: .76rem; overflow: hidden; text-overflow: ellipsis; }
        .pf-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          width: 100%;
          padding: .5rem .7rem;
          border-radius: 9px;
          border: 1px solid var(--pf-border);
          background: transparent;
          color: var(--pf-muted);
          font-family: inherit;
          font-size: .84rem;
          font-weight: 600;
          cursor: pointer;
        }
        .pf-logout:hover { color: var(--pf-text); border-color: var(--pf-muted); }

        .pf-toggle { display: none; }
        .pf-scrim {
          position: fixed;
          inset: 0;
          background: rgb(0 0 0 / 45%);
          border: 0;
          z-index: 45;
        }
        .pf-main {
          grid-area: main;
          padding: 1.25rem 1rem 3rem;
          max-width: 1180px;
          width: 100%;
          color: var(--admin-text);
        }

        @media (min-width: 960px) {
          .pf-grid {
            grid-template-columns: 272px 1fr;
            grid-template-areas: "nav main";
            transition: grid-template-columns .18s ease;
          }
          .pf-topbar { display: none; }
          .pf-nav {
            grid-area: nav;
            position: sticky;
            inset: auto;
            top: 0;
            align-self: start;
            height: 100dvh;
            transform: none;
            width: auto;
          }
          .pf-scrim { display: none; }
          .pf-main {
            padding: 2rem 2rem 4rem;
            transition: max-width .18s ease;
          }

          .pf-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 30px;
            height: 30px;
            margin-left: auto;
            padding: 0;
            border-radius: 8px;
            border: 1px solid var(--pf-border);
            background: transparent;
            color: var(--pf-muted);
            cursor: pointer;
          }
          .pf-toggle:hover { background: rgb(255 255 255 / 8%); color: var(--pf-text); }
          .pf-toggle:focus-visible { outline: 2px solid var(--pf-accent); outline-offset: 2px; }

          :root[data-platform-nav="collapsed"] .pf-grid {
            grid-template-columns: 74px 1fr;
          }
          :root[data-platform-nav="collapsed"] .pf-main { max-width: none; }
          :root[data-platform-nav="collapsed"] .pf-text {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip-path: inset(50%);
            white-space: nowrap;
          }
          :root[data-platform-nav="collapsed"] .pf-nav-head { justify-content: center; padding: 1.1rem .5rem; }
          :root[data-platform-nav="collapsed"] .pf-toggle { margin-left: 0; }
          :root[data-platform-nav="collapsed"] .pf-list { padding: .6rem .4rem; }
          :root[data-platform-nav="collapsed"] .pf-link {
            justify-content: center;
            padding-left: 0;
            padding-right: 0;
            gap: 0;
          }
          :root[data-platform-nav="collapsed"] .pf-foot { padding: .75rem .4rem 1.1rem; }
          :root[data-platform-nav="collapsed"] .pf-who { display: none; }
          :root[data-platform-nav="collapsed"] .pf-logout { padding: .5rem; }
          @media (prefers-reduced-motion: reduce) {
            .pf-grid, .pf-main { transition: none; }
          }
        }
      `}</style>
    </div>
  );
}
