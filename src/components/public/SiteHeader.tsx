"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string };

/**
 * Public site header.
 *
 * A pill floating over the hero photograph rather than a bar sitting on top of
 * it: the photograph is the first thing a visitor should see, and a solid band
 * across it crops the very image the site is selling.
 *
 * It stays translucent while the hero is behind it and turns solid once the
 * page has scrolled past, because glass over cream is unreadable.
 *
 * Mobile first: below 900px the links collapse into a panel and the booking
 * call to action stays visible, since booking is what most visitors came for.
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
  const [scrolled, setScrolled] = useState(false);

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

  // Roughly the height of the hero. Past it there is no photograph left to be
  // transparent over.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="site-header" data-scrolled={scrolled ? "true" : undefined}>
      <div className="container">
        <div className="site-bar">
          <nav aria-label="Navigation principale" className="site-nav">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="site-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <Link href={homeHref} className="site-brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" width={32} height={32} />
            ) : (
              <span aria-hidden="true" className="site-brand-mark">
                ✿
              </span>
            )}
            <span className="site-brand-name">{businessName}</span>
          </Link>

          <div className="site-actions">
            {bookingEnabled ? (
              <Link href={bookingHref} className="site-cta">
                Réserver <span aria-hidden="true">›</span>
              </Link>
            ) : null}

            <button
              type="button"
              className="site-burger"
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
        </div>

        <div id="site-mobile-nav" hidden={!open} className="site-panel">
          <nav aria-label="Navigation">
            {nav.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
