"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The platform's own header.
 *
 * It used to borrow the floating pill from the provider sites, which made the
 * two indistinguishable at a glance — bad for us, worse for a provider who
 * should feel that her site is hers and not a page of ours. This one is a
 * plain bar: flat, left-aligned, cream on cream. A tool announces itself
 * quietly; the beauty belongs on her side.
 */

const LINKS = [
  { href: "#demo", label: "Démo" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#modules", label: "Modules" },
  { href: "#nous", label: "Qui sommes-nous" },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="mk-nav" data-scrolled={scrolled ? "true" : undefined}>
      <div className="container">
        <Link href="/" className="mk-logo">
          <span aria-hidden="true" className="mk-logo-mark" />
          Prestataires
        </Link>

        <nav aria-label="Navigation principale" className="mk-nav-links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mk-nav-actions">
          <Link href="/login" className="mk-nav-login">
            Se connecter
          </Link>
          <Link href="/demo" className="mk-btn mk-btn-sm">
            Essayer
          </Link>
        </div>
      </div>
    </header>
  );
}
