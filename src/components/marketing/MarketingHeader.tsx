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
        {/* The real mark, lifted out of the supplied artwork by
            scripts/extract-logo.mjs. It replaced a rose diamond and the name
            set in Playfair, which was a second logo competing with the one on
            the page. */}
        <Link href="/" className="mk-logo" aria-label={PRODUCT.name}>
          <img
            src="/beautyprest-mark.png"
            alt={PRODUCT.name}
            width={316}
            height={113}
          />
        </Link>

        {/* The bands of the landing page, in the order they appear on it. */}
        <nav aria-label="Navigation principale" className="mk-nav-links">
          <a href={`${prefix}#site`}>Le site</a>
          <a href={`${prefix}#agenda`}>L&apos;agenda</a>
          <a href={`${prefix}#metiers`}>Les métiers</a>
          <a href={`${prefix}#tarifs`}>Tarifs</a>
        </nav>

        {/* The button opens an account rather than opening the demo. The demo
            is one click further down, in the opening screen, where somebody
            who is not ready to sign up will look for it. */}
        <div className="mk-nav-actions">
          <Link href="/login" className="mk-nav-login">
            Se connecter
          </Link>
          <Link href="/inscription" className="mk-btn mk-btn-sm">
            Créer mon espace
          </Link>
        </div>
      </div>
    </header>
  );
}
