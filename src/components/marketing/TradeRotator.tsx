"use client";

import { useEffect, useState } from "react";

/**
 * One word in the headline, cycling through the trades.
 *
 * It is the cheapest possible answer to "is this for me?": within a few
 * seconds a barber sees his own trade named in our sentence. Nothing else on
 * the page moves, so the eye goes to it without the page feeling animated.
 *
 * The slot is sized to the longest word up front — reserving the width in the
 * markup rather than letting each word set it — so the sentence never reflows
 * as it turns. And it holds still for anyone who has asked the system for less
 * motion, which for this component means simply showing the first word.
 */
export function TradeRotator({
  words,
  intervalMs = 2200,
}: {
  words: readonly string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced || words.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % words.length),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [reduced, words.length, intervalMs]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className="mk-rotator">
      {/* Invisible, but it is what holds the line's width steady. */}
      <span aria-hidden="true" className="mk-rotator-ghost">
        {longest}
      </span>
      <span key={index} className="mk-rotator-word">
        {words[index]}
      </span>
    </span>
  );
}
