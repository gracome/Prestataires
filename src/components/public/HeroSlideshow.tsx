"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

/**
 * The hero photograph, turning.
 *
 * The words stay exactly where they are while the picture behind them changes:
 * a visitor reading the headline must never have it move under her. Only the
 * image cross-fades, and slowly enough to register as a change of scene rather
 * than a flicker.
 *
 * A slow push in on the visible photograph — the old documentary trick — is
 * what keeps a still image from looking frozen. It is the first thing dropped
 * when the system asks for less motion.
 */

export type HeroSlide = { id: string; url: string };

export function HeroSlideshow({
  slides,
  children,
  intervalMs = 6000,
}: {
  slides: HeroSlide[];
  children: ReactNode;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced || count < 2) return;
    const timer = window.setInterval(() => go(index + 1), intervalMs);
    return () => window.clearInterval(timer);
  }, [reduced, count, index, intervalMs, go]);

  return (
    <section className="site-hero">
      <div className="site-hero-stage" aria-hidden="true">
        {slides.map((slide, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={slide.id}
            src={slide.url}
            alt=""
            // The first one decides how fast the page feels; the rest can wait.
            fetchPriority={i === 0 ? "high" : "low"}
            loading={i === 0 ? "eager" : "lazy"}
            className="site-hero-img"
            data-current={i === index ? "true" : undefined}
            data-still={reduced ? "true" : undefined}
          />
        ))}
      </div>

      <span aria-hidden="true" className="site-hero-scrim" />

      {children}

      {count > 1 ? (
        <div className="site-hero-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Photo ${i + 1} sur ${count}`}
              aria-current={i === index}
              className="site-hero-dot"
              data-active={i === index ? "true" : undefined}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
