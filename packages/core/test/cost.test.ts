import { describe, it, expect } from "vitest";
import { computeCost, type PriceTable } from "../src/cost.js";

// Known prices injected so the test proves the MATH, not the shipped table.
const TEST_PRICES: PriceTable = {
  "test-model": { in: 10, out: 30 },
};

describe("computeCost", () => {
  it.each(["toString", "constructor", "__proto__"])("rejects inherited model %s", (model) => {
    expect(() => computeCost({ tokensIn: 1, tokensOut: 1, model }, TEST_PRICES))
      .toThrow(/unknown model/i);
  });
  it("computes USD from token usage with injected prices", () => {
    const cost = computeCost(
      { tokensIn: 2_000_000, tokensOut: 1_000_000, model: "test-model" },
      TEST_PRICES,
    );
    // 2M in * 10/1M + 1M out * 30/1M = 20 + 30 = 50
    expect(cost).toBeCloseTo(50, 6);
  });

  it("returns 0 for zero tokens", () => {
    expect(
      computeCost({ tokensIn: 0, tokensOut: 0, model: "test-model" }, TEST_PRICES),
    ).toBe(0);
  });

  it("throws on unknown model so spend is never silently wrong", () => {
    expect(() =>
      computeCost({ tokensIn: 1, tokensOut: 1, model: "made-up" }, TEST_PRICES),
    ).toThrow(/unknown model/i);
  });
});
