"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string };

/**
 * Public site header.
 *
 * Mobile first: below 900px the links collapse into a disclosure panel and
 * the booking call to action stays visible at all times, since booking is
 * what most visitors came to do.
 */
export function SiteHeader({
  businessName,
  logoUrl,
  homeHref,
  bookingHref,
  nav,
  bookingEnabled,
}: {
  businessName: string;
  logoUrl: string | null;
  homeHref: string;
  bookingHref: string;
  nav: NavItem[];
  bookingEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Close the panel when the viewport grows past the mobile breakpoint, so the
  // page never gets stuck with both the panel and the inline nav showing.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const handle = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setOpen(false);
    };
    handle(query);
    query.addEventListener("change", handle);
    return () => query.removeEventListener("change", handle);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "color-mix(in srgb, var(--brand-background) 88%, transparent)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--brand-border)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          minHeight: 68,
        }}
      >
        <Link
          href={homeHref}
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".6rem",
            textDecoration: "none",
            color: "var(--brand-text)",
            marginRight: "auto",
            minWidth: 0,
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              width={38}
              height={38}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : null}
          <span
            className="font-display"
            style={{
              fontSize: "1.12rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {businessName}
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="site-nav">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        {bookingEnabled ? (
          <Link href={bookingHref} className="btn btn-primary site-cta">
            Réserver
          </Link>
        ) : null}

        <button
          type="button"
          className="btn btn-secondary site-burger"
          aria-expanded={open}
          aria-controls="site-mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="visually-hidden">
            {open ? "Fermer le menu" : "Ouvrir le menu"}
          </span>
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      <div
        id="site-mobile-nav"
        hidden={!open}
        style={{ borderTop: "1px solid var(--brand-border)" }}
      >
        <nav className="container" aria-label="Navigation" style={{ padding: "0.6rem 1.15rem 1rem" }}>
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "0.7rem 0",
                textDecoration: "none",
                color: "var(--brand-text)",
                fontWeight: 600,
                borderBottom: "1px solid var(--brand-border)",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <style>{`
        .site-nav { display: none; gap: 1.35rem; }
        .site-nav-link {
          text-decoration: none;
          color: var(--brand-muted);
          font-size: 0.92rem;
          font-weight: 500;
          white-space: nowrap;
        }
        .site-nav-link:hover { color: var(--brand-primary); }
        .site-cta { display: none; padding: 0.6rem 1.25rem; min-height: 40px; }
        .site-burger { padding: 0.55rem 0.8rem; min-height: 40px; }
        @media (min-width: 900px) {
          .site-nav { display: flex; }
          .site-cta { display: inline-flex; }
          .site-burger { display: none; }
        }
      `}</style>
    </header>
  );
}
