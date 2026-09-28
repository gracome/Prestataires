"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The carousel, used for the product tour, the template gallery and the
 * providers' own photo heroes.
 *
 * Auto-advance is a convenience, never a constraint: it stops the moment
 * someone points at it, tabs into it, drags it, or tells their system they
 * would rather things held still. A slideshow that keeps moving while you are
 * reading is the reason carousels have a bad name.
 */

export type Slide = {
  key: string;
  /** Read out to assistive technology and shown under the dots. */
  label: string;
  content: ReactNode;
};

export function Carousel({
  slides,
  intervalMs = 5000,
  autoplay = true,
  showLabels = false,
  showCounter = false,
  ariaLabel,
}: {
  slides: Slide[];
  intervalMs?: number;
  autoplay?: boolean;
  /** Print the current slide's name beside the dots. */
  showLabels?: boolean;
  /** Print "01 / 05" and give it previous/next buttons. */
  showCounter?: boolean;
  ariaLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);
  const regionId = useId();
  const dragStart = useRef<number | null>(null);

  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  // Someone who asked their system to reduce motion gets the slides, not the
  // slideshow: they can still move through it themselves.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!autoplay || held || reduced || count < 2) return;
    const timer = window.setInterval(() => go(index + 1), intervalMs);
    return () => window.clearInterval(timer);
  }, [autoplay, held, reduced, count, index, intervalMs, go]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(index + 1);
        if (event.key === "ArrowLeft") go(index - 1);
      }}
      onPointerDown={(event) => {
        dragStart.current = event.clientX;
        setHeld(true);
      }}
      onPointerUp={(event) => {
        const from = dragStart.current;
        dragStart.current = null;
        setHeld(false);
        // Far enough to be a swipe rather than a tap that wandered.
        if (from !== null && Math.abs(event.clientX - from) > 40) {
          go(index + (event.clientX < from ? 1 : -1));
        }
      }}
      style={{ display: "grid", gap: "1rem" }}
    >
      <div
        id={regionId}
        aria-live={held ? "polite" : "off"}
        style={{
          position: "relative",
          display: "grid",
          // Every slide sits in the same cell, so the frame keeps the height of
          // the tallest one and nothing below it jumps on each change.
          gridTemplateAreas: '"slide"',
        }}
      >
        {slides.map((slide, i) => {
          const current = i === index;
          return (
            <div
              key={slide.key}
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${count} — ${slide.label}`}
              aria-hidden={!current}
              // Hidden slides keep their space but leave the tab order, so
              // nothing focusable is reachable behind the visible one.
              inert={!current ? true : undefined}
              style={{
                gridArea: "slide",
                opacity: current ? 1 : 0,
                transform: current ? "none" : "translateY(8px) scale(.99)",
                transition: reduced
                  ? "none"
                  : "opacity .45s ease, transform .45s ease",
                pointerEvents: current ? "auto" : "none",
              }}
            >
              {slide.content}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".75rem",
          flexWrap: "wrap",
        }}
      >
        {showCounter ? (
          <>
            <button
              type="button"
              className="carousel-arrow"
              onClick={() => go(index - 1)}
              aria-label="Diapositive précédente"
            >
              ←
            </button>
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                fontSize: ".85rem",
                color: "var(--brand-muted)",
              }}
            >
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="carousel-arrow"
              onClick={() => go(index + 1)}
              aria-label="Diapositive suivante"
            >
              →
            </button>
          </>
        ) : null}

        <div style={{ display: "flex", gap: ".45rem" }}>
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => go(i)}
              aria-label={slide.label}
              aria-current={i === index}
              className="carousel-dot"
              data-active={i === index ? "true" : undefined}
            />
          ))}
        </div>

        {showLabels ? (
          <span style={{ fontSize: ".85rem", color: "var(--brand-muted)" }}>
            {slides[index].label}
          </span>
        ) : null}
      </div>
    </section>
  );
}
