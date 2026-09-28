"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The hero of a provider's site: her work, turned.
 *
 * The centre photo is large and its neighbours are cut off at the edges, which
 * is the whole trick — a single framed picture reads as decoration, while a
 * photo with more photo either side reads as a portfolio you are partway
 * through. It is also the honest shape: it says there is more to see.
 *
 * Captions carry the prestation and its price. A visitor looking at a photo
 * she likes should not have to go and find out what it is called or what it
 * costs; that is the moment she decides to book.
 */

export type HeroPhoto = {
  id: string;
  url: string;
  /** Prestation the photo came from, when it came from one. */
  title: string | null;
  price: string | null;
  caption: string | null;
};

export function HeroCarousel({
  photos,
  businessName,
}: {
  photos: HeroPhoto[];
  businessName: string;
}) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);
  const dragStart = useRef<number | null>(null);

  const count = photos.length;
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
    if (held || reduced || count < 2) return;
    const timer = window.setInterval(() => go(index + 1), 5500);
    return () => window.clearInterval(timer);
  }, [held, reduced, count, index, go]);

  if (count === 0) return null;

  const current = photos[index];

  return (
    <div
      aria-roledescription="carrousel"
      aria-label={`Réalisations de ${businessName}`}
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
        if (from !== null && Math.abs(event.clientX - from) > 40) {
          go(index + (event.clientX < from ? 1 : -1));
        }
      }}
      className="hero-carousel"
    >
      <div className="hero-carousel-track">
        {photos.map((photo, i) => {
          // Distance from the centre, wrapped, so the two neighbours of the
          // last photo are the first ones rather than nothing.
          let offset = i - index;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;

          const visible = Math.abs(offset) <= 1;

          return (
            <figure
              key={photo.id}
              aria-hidden={offset !== 0}
              className="hero-carousel-slide"
              data-position={offset === 0 ? "centre" : offset < 0 ? "left" : "right"}
              style={{
                opacity: visible ? 1 : 0,
                transform:
                  offset === 0
                    ? "translateX(0) scale(1)"
                    : `translateX(${offset * 78}%) scale(.82)`,
                transition: reduced ? "none" : "transform .55s ease, opacity .55s ease",
                zIndex: offset === 0 ? 2 : 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={offset === 0 ? (photo.title ?? photo.caption ?? "") : ""}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
              />
            </figure>
          );
        })}
      </div>

      <div className="hero-carousel-bar">
        <p className="hero-carousel-caption">
          {current.title ? (
            <>
              <span className="hero-carousel-title">{current.title}</span>
              {current.price ? (
                <span className="hero-carousel-price">{current.price}</span>
              ) : null}
            </>
          ) : (
            <span className="hero-carousel-title">
              {current.caption ?? businessName}
            </span>
          )}
        </p>

        <div className="hero-carousel-controls">
          <button
            type="button"
            className="carousel-arrow"
            onClick={() => go(index - 1)}
            aria-label="Photo précédente"
          >
            ←
          </button>
          <span className="hero-carousel-counter">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="carousel-arrow"
            onClick={() => go(index + 1)}
            aria-label="Photo suivante"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
