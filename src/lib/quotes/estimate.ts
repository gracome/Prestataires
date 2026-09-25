/**
 * The guided quote estimator (cahier des charges section 18).
 *
 * A quote request should not be a blank form. The customer answers a few
 * questions and sees an approximate price straight away, which is the whole
 * point: she knows roughly what it costs before deciding to write.
 *
 * This module is pure so the same computation runs in the browser for the live
 * total and on the server when the request is stored. The server answer is the
 * one that counts: a price computed in the browser is a suggestion, not a fact.
 */

export type EstimatorOption = {
  id: string;
  label: string;
  description: string | null;
  priceAdjustment: number;
  durationAdjustment: number;
};

export type EstimatorQuestion = {
  id: string;
  label: string;
  helpText: string | null;
  kind: "SINGLE_CHOICE" | "MULTI_CHOICE";
  required: boolean;
  options: EstimatorOption[];
};

export type EstimatorConfig = {
  basePrice: number;
  baseDurationMinutes: number;
  /** Half-width of the announced range, in percent. */
  marginPercent: number;
  questions: EstimatorQuestion[];
};

/** Option ids chosen per question. */
export type EstimatorAnswers = Record<string, string[]>;

export type EstimateLine = {
  question: string;
  choice: string;
  priceAdjustment: number;
};

export type Estimate = {
  /** Exact sum of the base and the chosen options, in minor units. */
  total: number;
  /** Announced range, widened by the margin and rounded outwards. */
  min: number;
  max: number;
  durationMinutes: number;
  lines: EstimateLine[];
  /** Questions marked required that have no answer yet. */
  missing: string[];
  complete: boolean;
};

/**
 * Round to something a person would say out loud. FCFA amounts are quoted in
 * hundreds, so "8 500" reads better than "8 473".
 */
function roundTo(value: number, step: number, direction: "down" | "up"): number {
  if (step <= 1) return Math.round(value);
  return direction === "down"
    ? Math.floor(value / step) * step
    : Math.ceil(value / step) * step;
}

export function computeEstimate(
  config: EstimatorConfig,
  answers: EstimatorAnswers,
  options: { roundingStep?: number } = {},
): Estimate {
  const step = options.roundingStep ?? 100;

  let total = Math.max(0, config.basePrice);
  let durationMinutes = Math.max(0, config.baseDurationMinutes);
  const lines: EstimateLine[] = [];
  const missing: string[] = [];

  for (const question of config.questions) {
    const chosenIds = answers[question.id] ?? [];

    // A single-choice question keeps only the first answer, so a tampered
    // payload cannot stack several options that were meant to be exclusive.
    const effective =
      question.kind === "SINGLE_CHOICE" ? chosenIds.slice(0, 1) : chosenIds;

    const chosen = effective
      .map((id) => question.options.find((option) => option.id === id))
      .filter((option): option is EstimatorOption => option !== undefined);

    if (question.required && chosen.length === 0) {
      missing.push(question.label);
      continue;
    }

    for (const option of chosen) {
      total += option.priceAdjustment;
      durationMinutes += option.durationAdjustment;
      lines.push({
        question: question.label,
        choice: option.label,
        priceAdjustment: option.priceAdjustment,
      });
    }
  }

  // A misconfigured set of negative adjustments must never quote below zero.
  total = Math.max(0, total);
  durationMinutes = Math.max(0, durationMinutes);

  const margin = Math.max(0, Math.min(90, config.marginPercent)) / 100;

  return {
    total,
    min: roundTo(total * (1 - margin), step, "down"),
    max: roundTo(total * (1 + margin), step, "up"),
    durationMinutes,
    lines,
    missing,
    complete: missing.length === 0,
  };
}

/**
 * Parse the answers coming from a form. Values arrive as `q:<questionId>`
 * fields, repeated for a multi-choice question.
 */
export function parseAnswers(
  entries: Iterable<[string, FormDataEntryValue]>,
): EstimatorAnswers {
  const answers: EstimatorAnswers = {};

  for (const [key, value] of entries) {
    if (!key.startsWith("q:") || typeof value !== "string" || !value) continue;
    const questionId = key.slice(2);
    (answers[questionId] ??= []).push(value);
  }

  return answers;
}

/** A short line for the email and the dashboard, e.g. "entre 9 000 et 12 000". */
export function describeRange(
  estimate: Estimate,
  format: (amount: number) => string,
): string {
  if (estimate.min === estimate.max) return format(estimate.total);
  return `entre ${format(estimate.min)} et ${format(estimate.max)}`;
}
