import { describe, expect, it } from "vitest";
import {
  computeDeposit,
  currencyDecimals,
  formatMoney,
  toMajorUnits,
  toMinorUnits,
} from "@/lib/money";

describe("currency handling", () => {
  it("knows that FCFA has no subunit", () => {
    expect(currencyDecimals("XOF")).toBe(0);
    expect(currencyDecimals("XAF")).toBe(0);
    expect(toMinorUnits(8000, "XOF")).toBe(8000);
    expect(toMajorUnits(8000, "XOF")).toBe(8000);
  });

  it("converts decimal currencies to minor units", () => {
    expect(toMinorUnits(12.5, "EUR")).toBe(1250);
    expect(toMinorUnits("12,50", "EUR")).toBe(1250);
    expect(toMajorUnits(1250, "EUR")).toBe(12.5);
  });

  it("defaults an unknown currency to two decimals", () => {
    expect(currencyDecimals("ZZZ")).toBe(2);
  });

  it("rejects a value that is not a number", () => {
    expect(() => toMinorUnits("abc", "XOF")).toThrow();
  });

  it("formats FCFA the way it is written locally", () => {
    // Non-breaking group separators, so compare on digits and the symbol.
    const formatted = formatMoney(8000, "XOF");
    expect(formatted.replace(/\s/g, " ")).toBe("8 000 FCFA");
  });
});

describe("computeDeposit", () => {
  it("returns nothing when no deposit is required", () => {
    expect(
      computeDeposit(8000, {
        depositRequired: false,
        depositType: "FIXED",
        depositValue: 3000,
      }),
    ).toBe(0);
  });

  it("returns the fixed amount from the specification example", () => {
    // Section 5: pose gel 8 000 FCFA, acompte 3 000 FCFA.
    expect(
      computeDeposit(8000, {
        depositRequired: true,
        depositType: "FIXED",
        depositValue: 3000,
      }),
    ).toBe(3000);
  });

  it("applies a percentage and rounds to the minor unit", () => {
    expect(
      computeDeposit(5000, {
        depositRequired: true,
        depositType: "PERCENTAGE",
        depositValue: 30,
      }),
    ).toBe(1500);

    expect(
      computeDeposit(7777, {
        depositRequired: true,
        depositType: "PERCENTAGE",
        depositValue: 33,
      }),
    ).toBe(2566);
  });

  it("never asks for more than the price of the service", () => {
    expect(
      computeDeposit(5000, {
        depositRequired: true,
        depositType: "FIXED",
        depositValue: 9000,
      }),
    ).toBe(5000);

    expect(
      computeDeposit(5000, {
        depositRequired: true,
        depositType: "PERCENTAGE",
        depositValue: 250,
      }),
    ).toBe(5000);
  });

  it("never returns a negative deposit", () => {
    expect(
      computeDeposit(5000, {
        depositRequired: true,
        depositType: "FIXED",
        depositValue: -100,
      }),
    ).toBe(0);
  });

  it("returns nothing for a free service", () => {
    expect(
      computeDeposit(0, {
        depositRequired: true,
        depositType: "PERCENTAGE",
        depositValue: 50,
      }),
    ).toBe(0);
  });
});
