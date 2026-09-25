import { describe, expect, it } from "vitest";
import {
  computeEstimate,
  describeRange,
  parseAnswers,
  type EstimatorConfig,
} from "@/lib/quotes/estimate";

/**
 * The estimator decides what price a customer is shown before she writes, so
 * the arithmetic and the guards against a tampered payload both matter.
 */

const CONFIG: EstimatorConfig = {
  basePrice: 6000,
  baseDurationMinutes: 60,
  marginPercent: 15,
  questions: [
    {
      id: "nails",
      label: "Combien d'ongles décorés ?",
      helpText: null,
      kind: "SINGLE_CHOICE",
      required: true,
      options: [
        { id: "two", label: "Un ou deux", description: null, priceAdjustment: 1000, durationAdjustment: 15 },
        { id: "five", label: "Quatre ou cinq", description: null, priceAdjustment: 2500, durationAdjustment: 30 },
        { id: "ten", label: "Les dix", description: null, priceAdjustment: 5000, durationAdjustment: 60 },
      ],
    },
    {
      id: "extras",
      label: "Options",
      helpText: null,
      kind: "MULTI_CHOICE",
      required: false,
      options: [
        { id: "relief", label: "Relief 3D", description: null, priceAdjustment: 3000, durationAdjustment: 30 },
        { id: "stones", label: "Strass", description: null, priceAdjustment: 1500, durationAdjustment: 15 },
      ],
    },
  ],
};

describe("computeEstimate", () => {
  it("starts from the base price when nothing is chosen", () => {
    const estimate = computeEstimate(CONFIG, {});
    expect(estimate.total).toBe(6000);
    expect(estimate.durationMinutes).toBe(60);
  });

  it("adds the chosen option to the base", () => {
    const estimate = computeEstimate(CONFIG, { nails: ["five"] });
    expect(estimate.total).toBe(8500);
    expect(estimate.durationMinutes).toBe(90);
    expect(estimate.complete).toBe(true);
  });

  it("adds every option of a multi-choice question", () => {
    const estimate = computeEstimate(CONFIG, {
      nails: ["ten"],
      extras: ["relief", "stones"],
    });
    expect(estimate.total).toBe(6000 + 5000 + 3000 + 1500);
    expect(estimate.durationMinutes).toBe(60 + 60 + 30 + 15);
  });

  it("keeps only the first answer of a single-choice question", () => {
    // A tampered payload must not stack options that are meant to exclude
    // each other.
    const estimate = computeEstimate(CONFIG, { nails: ["two", "ten"] });
    expect(estimate.total).toBe(7000);
    expect(estimate.lines).toHaveLength(1);
  });

  it("ignores an option id that does not belong to the question", () => {
    const estimate = computeEstimate(CONFIG, { nails: ["relief"] });
    expect(estimate.total).toBe(6000);
    expect(estimate.missing).toContain("Combien d'ongles décorés ?");
  });

  it("reports the required questions still unanswered", () => {
    const estimate = computeEstimate(CONFIG, { extras: ["stones"] });
    expect(estimate.complete).toBe(false);
    expect(estimate.missing).toEqual(["Combien d'ongles décorés ?"]);
  });

  it("does not block on an optional question", () => {
    const estimate = computeEstimate(CONFIG, { nails: ["two"] });
    expect(estimate.complete).toBe(true);
    expect(estimate.missing).toEqual([]);
  });

  it("widens the range by the margin and rounds outwards", () => {
    const estimate = computeEstimate(CONFIG, { nails: ["five"] });
    // 8500 ± 15% is 7225 to 9775, rounded to 7200 and 9800.
    expect(estimate.min).toBe(7200);
    expect(estimate.max).toBe(9800);
    expect(estimate.min).toBeLessThan(estimate.total);
    expect(estimate.max).toBeGreaterThan(estimate.total);
  });

  it("announces a single figure when the margin is zero", () => {
    const estimate = computeEstimate(
      { ...CONFIG, marginPercent: 0 },
      { nails: ["five"] },
    );
    expect(estimate.min).toBe(estimate.max);
  });

  it("never quotes a negative price", () => {
    const estimate = computeEstimate(
      {
        ...CONFIG,
        basePrice: 1000,
        questions: [
          {
            id: "discount",
            label: "Remise",
            helpText: null,
            kind: "SINGLE_CHOICE",
            required: false,
            options: [
              { id: "big", label: "Grosse remise", description: null, priceAdjustment: -9000, durationAdjustment: 0 },
            ],
          },
        ],
      },
      { discount: ["big"] },
    );
    expect(estimate.total).toBe(0);
    expect(estimate.min).toBeGreaterThanOrEqual(0);
  });

  it("clamps an absurd margin instead of quoting nonsense", () => {
    const estimate = computeEstimate(
      { ...CONFIG, marginPercent: 500 },
      { nails: ["five"] },
    );
    expect(estimate.min).toBeGreaterThanOrEqual(0);
    expect(estimate.max).toBeGreaterThan(estimate.total);
  });

  it("lists what the customer chose, for the provider to read", () => {
    const estimate = computeEstimate(CONFIG, {
      nails: ["ten"],
      extras: ["relief"],
    });
    expect(estimate.lines).toEqual([
      { question: "Combien d'ongles décorés ?", choice: "Les dix", priceAdjustment: 5000 },
      { question: "Options", choice: "Relief 3D", priceAdjustment: 3000 },
    ]);
  });
});

describe("parseAnswers", () => {
  it("collects the prefixed fields, grouping repeats", () => {
    const form = new FormData();
    form.append("customerName", "Awa");
    form.append("q:nails", "five");
    form.append("q:extras", "relief");
    form.append("q:extras", "stones");

    expect(parseAnswers(form.entries())).toEqual({
      nails: ["five"],
      extras: ["relief", "stones"],
    });
  });

  it("ignores fields that are not answers", () => {
    const form = new FormData();
    form.append("description", "un truc");
    expect(parseAnswers(form.entries())).toEqual({});
  });
});

describe("describeRange", () => {
  const format = (amount: number) => `${amount} FCFA`;

  it("reads as a range", () => {
    const estimate = computeEstimate(CONFIG, { nails: ["five"] });
    expect(describeRange(estimate, format)).toBe("entre 7200 FCFA et 9800 FCFA");
  });

  it("reads as one figure when there is no margin", () => {
    const estimate = computeEstimate({ ...CONFIG, marginPercent: 0 }, { nails: ["five"] });
    expect(describeRange(estimate, format)).toBe("8500 FCFA");
  });
});
