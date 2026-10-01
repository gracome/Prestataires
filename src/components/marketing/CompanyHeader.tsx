"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPANY } from "@/lib/marketing/company";

/**
 * The company header.
 *
 * Plain and left-aligned, cream on cream — deliberately not the floating pill
 * a provider's own site wears. A studio announces itself quietly; the beauty
 * belongs to the sites it builds.
 *
 * `product` names the page's product when there is one, so /prestataire reads
 * as a page of this company rather than a separate site. It is a label beside
 * the logo, not a second brand: the visitor should always know whose site she
 * is on, and one click back to it is enough.
 */
export function CompanyHeader({ product }: { product?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = product
    ? [
        { href: "#demo", label: "Démo" },
        { href: "#tarifs", label: "Tarifs" },
        { href: "#modules", label: "Modules" },
      ]
    : [
        { href: "/#services", label: "Ce que nous faisons" },
        { href: "/#nous", label: "Qui sommes-nous" },
      ];

  return (
    <header className="mk-nav" data-scrolled={scrolled ? "true" : undefined}>
      <div className="container">
        <Link href="/" className="mk-logo">
          <span aria-hidden="true" className="mk-logo-mark" />
          {COMPANY.name}
        </Link>

        {product ? (
          <span className="mk-logo-product">
            <span aria-hidden="true">/</span> {product}
          </span>
        ) : null}

        <nav aria-label="Navigation principale" className="mk-nav-links">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* The call to action is the company's, not a product's. A header
            button marked "voir la démo" offered one of three things to every
            visitor, including the two who came for the other two. On a product
            page it earns its place; everywhere else, writing to us does. */}
        <div className="mk-nav-actions">
          <Link href="/login" className="mk-nav-login">
            Se connecter
          </Link>
          {product ? (
            <Link href="/demo" className="mk-btn mk-btn-sm">
              Voir la démo
            </Link>
          ) : (
            <a href={COMPANY.whatsapp} className="mk-btn mk-btn-sm">
              Nous écrire
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
