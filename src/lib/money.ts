/**
 * Money handling.
 *
 * Every amount in the database is an integer in the MINOR unit of the
 * provider currency. West African CFA francs (XOF) have no subunit, so
 * 8 000 FCFA is stored as 8000. Currencies with cents store cents.
 */

const DECIMALS: Record<string, number> = {
  XOF: 0,
  XAF: 0,
  JPY: 0,
  KRW: 0,
  EUR: 2,
  USD: 2,
  GBP: 2,
  CAD: 2,
  MAD: 2,
  NGN: 2,
  GHS: 2,
};

const SYMBOLS: Record<string, string> = {
  XOF: "FCFA",
  XAF: "FCFA",
  EUR: "EUR",
  USD: "USD",
  GBP: "GBP",
  MAD: "MAD",
  NGN: "NGN",
  GHS: "GHS",
};

export function currencyDecimals(currency: string): number {
  return DECIMALS[currency.toUpperCase()] ?? 2;
}

/** Convert a human-entered major amount ("8000" or "12.50") to minor units. */
export function toMinorUnits(value: number | string, currency: string): number {
  const decimals = currencyDecimals(currency);
  const numeric = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid monetary value: ${String(value)}`);
  }
  return Math.round(numeric * 10 ** decimals);
}

export function toMajorUnits(minor: number, currency: string): number {
  return minor / 10 ** currencyDecimals(currency);
}

/**
 * Format for display. FCFA reads best as "8 000 FCFA" with a non-breaking
 * thin space, which is what fr-FR grouping produces.
 */
export function formatMoney(
  minor: number,
  currency: string,
  locale = "fr-FR",
): string {
  const decimals = currencyDecimals(currency);
  const amount = toMajorUnits(minor, currency);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  const symbol = SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
  return `${formatted} ${symbol}`;
}

export type DepositRule = {
  depositRequired: boolean;
  depositType: "NONE" | "FIXED" | "PERCENTAGE";
  depositValue: number;
};

/**
 * Resolve the deposit owed for a given total.
 *
 * PERCENTAGE stores whole percentage points (30 means 30%). The result is
 * rounded to the nearest minor unit and clamped to the total, so a
 * misconfigured rule can never ask for more than the service price.
 */
export function computeDeposit(total: number, rule: DepositRule): number {
  if (!rule.depositRequired || rule.depositType === "NONE") return 0;
  if (total <= 0) return 0;

  const raw =
    rule.depositType === "PERCENTAGE"
      ? Math.round((total * rule.depositValue) / 100)
      : rule.depositValue;

  return Math.max(0, Math.min(raw, total));
}
