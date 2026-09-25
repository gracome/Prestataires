/**
 * Reading an amount as it gets typed at a counter.
 *
 * "6 000", "6000" and a non-breaking space pasted from a phone keyboard all
 * mean the same takings, and a comma is a decimal point in French. Returns
 * null when there is no usable number, so the form can say so rather than
 * quietly recording a zero.
 *
 * Kept free of any import on purpose: it runs in a server action and in tests,
 * and neither should drag a database client along to read a price.
 */
export function parseAmountInput(raw: string): string | null {
  const cleaned = raw
    .trim()
    // Ordinary space, non-breaking space, narrow non-breaking space.
    .replace(/[\s  ]/g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  if (Number(cleaned) <= 0) return null;

  return cleaned;
}
