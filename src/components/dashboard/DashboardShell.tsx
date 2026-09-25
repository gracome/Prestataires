"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { logout } from "@/app/login/actions";
import { NavIcon, type IconName } from "./nav-icons";
import { canAccess, type Section } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

/**
 * Dashboard chrome (cahier des charges section 19).
 *
 * The menu is a permanent sidebar on a laptop and a slide-over panel on a
 * phone. Providers often work from their phone between clients, so every
 * screen in here has to be reachable without a desktop.
 *
 * On a laptop the sidebar folds down to a rail of icons. On a small laptop the
 * menu eats a quarter of the width, which is exactly the width a calendar or a
 * report table wants back.
 */

type NavEntry = {
  href: string;
  label: string;
  icon: IconName;
  /** Which permission opens it. The menu is filtered with the same table
      the guard uses, so a hidden entry is also a refused address. */
  section: Section;
  badgeKey?: "reservations" | "devis";
};

const NAV: NavEntry[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "grid", section: "home" },
  { href: "/dashboard/reservations", label: "Réservations", icon: "bookings", section: "bookings", badgeKey: "reservations" },
  { href: "/dashboard/caisse", label: "Caisse", icon: "card", section: "till" },
  { href: "/dashboard/calendrier", label: "Calendrier", icon: "calendar", section: "calendar" },
  { href: "/dashboard/services", label: "Prestations et tarifs", icon: "tag", section: "services" },
  { href: "/dashboard/horaires", label: "Horaires et absences", icon: "clock", section: "hours" },
  { href: "/dashboard/galerie", label: "Galerie", icon: "image", section: "gallery" },
  { href: "/dashboard/informations", label: "Informations et apparence", icon: "palette", section: "site" },
  { href: "/dashboard/paiement", label: "Paiement et acompte", icon: "sliders", section: "payment" },
  { href: "/dashboard/devis", label: "Demandes de devis", icon: "quote", section: "quotes", badgeKey: "devis" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "bell", section: "notifications" },
  { href: "/dashboard/parametres", label: "Paramètres", icon: "sliders", section: "settings" },
];

const STORAGE_KEY = "admin-nav";

/**
 * Read the stored choice before the first paint.
 *
 * Restoring the folded menu from an effect would show it wide for one frame
 * and then snap it shut on every page. This runs where it is written, which is
 * ahead of the menu markup in the stream, so the menu is already the right
 * width the first time it is painted.
 */
const RESTORE_SCRIPT = `try{var v=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(v==="collapsed"||v==="expanded")document.documentElement.dataset.adminNav=v}catch(e){}`;

/**
 * The label of one menu entry, aware of its own navigation.
 *
 * `useLinkStatus` only reports while the parent Link is being navigated to, so
 * the spinner appears on the entry that was actually clicked. Every dashboard
 * page is dynamic and takes a few hundred milliseconds, and without this the
 * menu looked unresponsive and got clicked again.
 */
function NavLabel({
  label,
  count,
  icon,
}: {
  label: string;
  count: number;
  icon: IconName;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      <NavIcon name={icon} className="admin-nav-icon" />
      <span className="admin-nav-text">{label}</span>
      {pending ? (
        <span className="admin-spinner" role="status">
          <span className="visually-hidden">Ouverture de {label}…</span>
        </span>
      ) : count > 0 ? (
        <span className="admin-badge">{count}</span>
      ) : null}
    </>
  );
}

export function DashboardShell({
  children,
  businessName,
  userName,
  slug,
  badges,
  themeStyle,
  role,
}: {
  children: React.ReactNode;
  businessName: string;
  userName: string;
  slug: string;
  badges: { reservations: number; devis: number };
  /** The provider palette, written as custom properties on the wrapper. */
  themeStyle: CSSProperties;
  /** Decides which entries are drawn. The guard decides which open. */
  role: UserRole;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Navigating on a phone should close the panel it was opened from.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // The width is already right, painted by the script above. This only brings
  // React's idea of it in line, so the button says the right thing.
  useEffect(() => {
    setCollapsed(document.documentElement.dataset.adminNav === "collapsed");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      const value = next ? "collapsed" : "expanded";
      document.documentElement.dataset.adminNav = value;
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // Private browsing or blocked storage: the menu still folds, it just
        // will not be remembered. Not worth failing over.
      }
      return next;
    });
  }, []);

  return (
    <div className="admin" style={themeStyle}>
      <script dangerouslySetInnerHTML={{ __html: RESTORE_SCRIPT }} />

      <a href="#admin-main" className="skip-link">
        Aller au contenu
      </a>

      <div className="admin-grid">
        <header className="admin-topbar">
          <button
            type="button"
            className="btn btn-secondary admin-burger"
            aria-expanded={menuOpen}
            aria-controls="admin-nav"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
            <span className="visually-hidden">Menu</span>
          </button>

          <span
            style={{
              fontWeight: 700,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {businessName}
          </span>

          <Link
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{
              marginLeft: "auto",
              fontSize: ".85rem",
              padding: ".4rem .7rem",
              minHeight: 36,
            }}
          >
            Voir le site
          </Link>
        </header>

        <nav
          id="admin-nav"
          className={`admin-nav${menuOpen ? " is-open" : ""}`}
          aria-label="Navigation du tableau de bord"
        >
          <div className="admin-nav-head">
            <div className="admin-nav-text" style={{ minWidth: 0 }}>
              <p
                style={{
                  fontWeight: 700,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {businessName}
              </p>
              <p
                style={{
                  margin: ".15rem 0 0",
                  fontSize: ".8rem",
                  color: "var(--admin-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userName}
              </p>
            </div>

            <button
              type="button"
              className="admin-nav-toggle"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-controls="admin-nav"
              title={collapsed ? "Déplier le menu" : "Replier le menu"}
            >
              <NavIcon name={collapsed ? "chevron-right" : "chevron-left"} size={18} />
              <span className="visually-hidden">
                {collapsed ? "Déplier le menu" : "Replier le menu"}
              </span>
            </button>
          </div>

          <ul className="admin-nav-list">
            {NAV.filter((entry) => canAccess(role, entry.section)).map((entry) => {
              const active =
                entry.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(entry.href);
              const count = entry.badgeKey ? badges[entry.badgeKey] : 0;

              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={active ? "page" : undefined}
                    className="admin-nav-link"
                    data-active={active ? "true" : undefined}
                    title={collapsed ? entry.label : undefined}
                  >
                    <NavLabel label={entry.label} count={count} icon={entry.icon} />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div style={{ padding: ".5rem .75rem 1rem", marginTop: "auto" }}>
            <form action={logout}>
              <button
                type="submit"
                className="btn btn-secondary btn-block admin-logout"
                style={{ fontSize: ".88rem" }}
              >
                <NavIcon name="logout" size={17} />
                <span className="admin-nav-text">Se déconnecter</span>
              </button>
            </form>
          </div>
        </nav>

        {menuOpen ? (
          <button
            type="button"
            className="admin-scrim"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <main id="admin-main" className="admin-main">
          {children}
        </main>
      </div>

      <style>{`
        .admin-grid {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
          grid-template-areas: "topbar" "main";
        }
        .admin-topbar {
          grid-area: topbar;
          display: flex;
          align-items: center;
          gap: .75rem;
          padding: .6rem 1rem;
          background: var(--admin-surface);
          border-bottom: 1px solid var(--admin-border);
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .admin-burger { padding: .4rem .7rem; min-height: 36px; }
        .admin-nav {
          position: fixed;
          inset: 0 auto 0 0;
          width: min(82vw, 288px);
          background: var(--admin-surface);
          border-right: 1px solid var(--admin-border);
          transform: translateX(-100%);
          transition: transform .2s ease;
          z-index: 50;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          /* The bar itself is hidden, the scrolling is not: wheel, touch,
             arrow keys and Tab all still move through the menu. */
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .admin-nav::-webkit-scrollbar { width: 0; height: 0; }
        .admin-nav.is-open { transform: translateX(0); }
        .admin-nav-head {
          position: relative;
          display: flex;
          align-items: center;
          gap: .5rem;
          padding: 1rem .95rem;
          border-bottom: 1px solid var(--admin-border);
        }
        .admin-nav-list {
          list-style: none;
          margin: 0;
          padding: .5rem;
          display: grid;
          gap: .15rem;
        }
        /* Folding is a laptop affordance: on a phone the menu is a drawer that
           is either open or gone, and a rail of icons would only be in the way. */
        .admin-nav-toggle { display: none; }
        .admin-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: .65rem;
          padding: .65rem .75rem;
          border-radius: 10px;
          text-decoration: none;
          color: var(--admin-text);
          font-size: .9rem;
          font-weight: 500;
          min-height: 42px;
        }
        .admin-nav-icon { flex-shrink: 0; opacity: .75; }
        .admin-nav-text { flex: 1; min-width: 0; }
        .admin-nav-link:hover { background: var(--admin-subtle); }
        .admin-nav-link:hover .admin-nav-icon { opacity: 1; }
        .admin-nav-link[data-active="true"] {
          background: color-mix(in srgb, var(--admin-accent) 14%, transparent);
          color: var(--admin-accent);
          font-weight: 700;
        }
        .admin-nav-link[data-active="true"] .admin-nav-icon { opacity: 1; }
        .admin-logout {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
        }
        /* Marks the entry being opened. Same footprint as the badge so the
           row does not jump when it appears. */
        .admin-spinner {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 2px solid color-mix(in srgb, var(--admin-accent) 30%, transparent);
          border-top-color: var(--admin-accent);
          animation: admin-spin .6s linear infinite;
        }
        @keyframes admin-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .admin-spinner { animation-duration: 2s; }
        }
        .admin-nav-link:has(.admin-spinner) {
          background: var(--admin-subtle);
        }
        .admin-badge {
          background: var(--admin-accent);
          color: var(--admin-accent-fg);
          border-radius: 999px;
          font-size: .7rem;
          font-weight: 700;
          padding: .1rem .45rem;
          min-width: 20px;
          text-align: center;
          flex-shrink: 0;
        }
        .admin-scrim {
          position: fixed;
          inset: 0;
          background: rgb(0 0 0 / 35%);
          border: 0;
          z-index: 45;
        }
        .admin-main {
          grid-area: main;
          padding: 1.25rem 1rem 3rem;
          /* Capped so a line of text stays readable on a wide monitor. The
             cap is lifted when the menu is folded: folding it is how the
             provider asks for the width back. */
          max-width: 1100px;
          width: 100%;
        }
        @media (min-width: 960px) {
          .admin-grid {
            grid-template-columns: 288px 1fr;
            grid-template-areas: "nav main";
            transition: grid-template-columns .18s ease;
          }
          .admin-topbar { display: none; }
          .admin-nav {
            grid-area: nav;
            position: sticky;
            /* Clear the mobile drawer offsets BEFORE setting top: the inset
               shorthand also writes top, so declaring it afterwards would
               reset top to auto and the sidebar would scroll away. */
            inset: auto;
            top: 0;
            /* A grid item is stretched to its row by default, which leaves it
               nothing to stick against. Anchoring it to the top and giving it
               the viewport height is what actually pins it. */
            align-self: start;
            height: 100dvh;
            transform: none;
            width: auto;
          }
          .admin-scrim { display: none; }
          .admin-main {
            padding: 2rem 2rem 4rem;
            transition: max-width .18s ease;
          }

          .admin-nav-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 30px;
            height: 30px;
            margin-left: auto;
            padding: 0;
            border-radius: 8px;
            border: 1px solid var(--admin-border);
            background: var(--admin-surface);
            color: var(--admin-muted);
            cursor: pointer;
          }
          .admin-nav-toggle:hover {
            background: var(--admin-subtle);
            color: var(--admin-text);
          }
          .admin-nav-toggle:focus-visible {
            outline: 2px solid var(--admin-accent);
            outline-offset: 2px;
          }

          /* Folded: a rail of icons. The labels stay in the document so a
             screen reader still announces them, they are only taken out of
             the picture. */
          :root[data-admin-nav="collapsed"] .admin-grid {
            grid-template-columns: 74px 1fr;
          }
          /* The whole point of folding: the calendar, the tables and the
             day-by-day chart get the screen back. */
          :root[data-admin-nav="collapsed"] .admin-main {
            max-width: none;
          }
          :root[data-admin-nav="collapsed"] .admin-nav-text {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip-path: inset(50%);
            white-space: nowrap;
          }
          :root[data-admin-nav="collapsed"] .admin-nav-head {
            justify-content: center;
            padding: 1rem .5rem;
          }
          :root[data-admin-nav="collapsed"] .admin-nav-toggle { margin-left: 0; }
          :root[data-admin-nav="collapsed"] .admin-nav-list { padding: .5rem .4rem; }
          :root[data-admin-nav="collapsed"] .admin-nav-link {
            justify-content: center;
            padding-left: 0;
            padding-right: 0;
            gap: 0;
          }
          :root[data-admin-nav="collapsed"] .admin-logout { padding: .5rem; }
          /* The count itself will not fit on a rail, so it becomes a dot: the
             provider still sees that something is waiting for her. */
          :root[data-admin-nav="collapsed"] .admin-badge {
            position: absolute;
            top: 6px;
            right: 12px;
            width: 9px;
            height: 9px;
            min-width: 0;
            padding: 0;
            font-size: 0;
            line-height: 0;
            color: transparent;
            border: 2px solid var(--admin-surface);
          }
          :root[data-admin-nav="collapsed"] .admin-spinner {
            position: absolute;
            top: 5px;
            right: 10px;
          }
          @media (prefers-reduced-motion: reduce) {
            .admin-grid, .admin-main { transition: none; }
          }
        }
      `}</style>
    </div>
  );
}
