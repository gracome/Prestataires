"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The platform's own header, built on the same floating pill the provider
 * sites use.
 *
 * Shared shape, different voice: a provider's bar leads with "Réserver"
 * because her visitor came to book; this one leads with the price, because a
 * provider arriving here is deciding whether to sign up.
 */

const LINKS = [
  { href: "#tarifs", label: "Tarifs" },
  { href: "#modules", label: "Modules" },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

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
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className="site-nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <Link href="/" className="site-brand">
            <span aria-hidden="true" className="site-brand-mark">
              ✿
            </span>
            <span className="site-brand-name">Prestataires</span>
          </Link>

          <div className="site-actions">
            <Link href="/login" className="site-nav-link site-header-login">
              Se connecter
            </Link>
            <Link href="#tarifs" className="site-cta">
              Commencer <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
