"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PRODUCT } from "@/lib/marketing/product";

/**
 * The header of the pages that sell the product.
 *
 * Plain and left-aligned, cream on cream — deliberately not the floating pill
 * a provider's own site wears. The beauty belongs to the sites it builds, and
 * a landing page that out-dresses them is selling the wrong thing.
 *
 * `inner` is set on the pages that are not the landing — the demo, a module —
 * where the first link has to lead back rather than scroll to an anchor.
 */
export function MarketingHeader({ inner }: { inner?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const prefix = inner ? "/" : "";

  return (
    <header className="mk-nav" data-scrolled={scrolled ? "true" : undefined}>
      <div className="container">
        <Link href="/" className="mk-logo">
          <span aria-hidden="true" className="mk-logo-mark" />
          {PRODUCT.name}
        </Link>

        {/* The same six questions the page answers, in the same order, minus
            the two a visitor never clicks for. Linking to "Démo" and "Modules"
            pointed at things she has to already know the product to want. */}
        <nav aria-label="Navigation principale" className="mk-nav-links">
          <a href={`${prefix}#produit`}>Le produit</a>
          <a href={`${prefix}#pour-qui`}>Pour qui</a>
          <a href={`${prefix}#tarifs`}>Tarifs</a>
          <a href={`${prefix}#commencer`}>Commencer</a>
        </nav>

        <div className="mk-nav-actions">
          <Link href="/login" className="mk-nav-login">
            Se connecter
          </Link>
          <Link href="/demo" className="mk-btn mk-btn-sm">
            Voir la démo
          </Link>
        </div>
      </div>
    </header>
  );
}
