import { randomInt } from "node:crypto";

/**
 * Human-facing identifiers.
 *
 * Booking references are read aloud over the phone and typed by hand, so the
 * alphabet drops the characters people confuse: 0/O, 1/I/L, 8/B, S/5.
 */

const ALPHABET = "ACDEFGHJKMNPQRTUVWXY2346789";

/** Combining diacritical marks, stripped after NFD normalisation. */
const COMBINING_MARKS = /[̀-ͯ]/g;

export function bookingReference(prefix = "RDV"): string {
  let body = "";
  for (let i = 0; i < 8; i += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** URL-safe slug: accents folded, punctuation collapsed to single hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Make `base` unique against a set of taken slugs by appending -2, -3, ...
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || "item";
  if (!used.has(root)) return root;

  let counter = 2;
  while (used.has(`${root}-${counter}`)) counter += 1;
  return `${root}-${counter}`;
}
