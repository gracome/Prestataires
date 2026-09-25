import { describe, expect, it } from "vitest";
import { parseAmountInput } from "@/lib/till/amount";

/**
 * Reading a price off a till screen.
 *
 * This runs between two customers on a phone, so whatever shape the amount
 * arrives in has to land on the right figure. A wrong reading here is a wrong
 * day's takings, which is worse than a rejected form.
 */

describe("parseAmountInput", () => {
  it("accepts a plain number", () => {
    expect(parseAmountInput("6000")).toBe("6000");
  });

  it("ignores the spaces a price is written with", () => {
    expect(parseAmountInput("6 000")).toBe("6000");
    expect(parseAmountInput("12 500")).toBe("12500");
    // Non-breaking space, which is what a French keyboard and a paste produce.
    expect(parseAmountInput("6 000")).toBe("6000");
    expect(parseAmountInput("6 000")).toBe("6000");
  });

  it("reads a comma as a decimal point", () => {
    expect(parseAmountInput("6,5")).toBe("6.5");
    expect(parseAmountInput("12,75")).toBe("12.75");
  });

  it("trims what was typed around it", () => {
    expect(parseAmountInput("  6000  ")).toBe("6000");
  });

  it("refuses anything that is not a number", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("6000 FCFA")).toBeNull();
    expect(parseAmountInput("-")).toBeNull();
  });

  it("refuses a negative or empty takings", () => {
    // A sale of nothing is a mistake, not a row.
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("0,00")).toBeNull();
    expect(parseAmountInput("-500")).toBeNull();
  });

  it("refuses a second separator rather than guessing", () => {
    // "6.000,50" could be six thousand or six; a wrong guess is a wrong till.
    expect(parseAmountInput("6.000,50")).toBeNull();
    expect(parseAmountInput("1.2.3")).toBeNull();
  });
});
