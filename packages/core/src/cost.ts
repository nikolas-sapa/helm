import type { Usage } from "./types.js";

export interface ModelPrice {
  in: number; // USD per 1M input tokens
  out: number; // USD per 1M output tokens
}

export type PriceTable = Record<string, ModelPrice>;

/**
 * Operator-verified price table. These numbers are a BILLING path and MUST be
 * confirmed against Anthropic's official pricing before relying on spend
 * figures — do not trust them as-shipped. `computeCost` takes a table argument
 * so the math is tested independently of these specific numbers.
 *
 * TODO(verify): confirm each entry against current Anthropic pricing.
 */
export const PRICES: PriceTable = {
  // model id -> { in, out } USD per 1M tokens  (VERIFY before billing)
  "claude-opus-4-8": { in: 0, out: 0 },
  "claude-sonnet-4-6": { in: 0, out: 0 },
  "claude-haiku-4-5": { in: 0, out: 0 },
};

/**
 * Compute USD cost from token usage. The price table is injected so callers
 * (and tests) supply known prices; correctness of the *math* does not depend on
 * the unverified PRICES constant.
 */
export function computeCost(u: Usage, prices: PriceTable = PRICES): number {
  const p = prices[u.model];
  if (!p) throw new Error(`unknown model: ${u.model}`);
  return (u.tokensIn / 1_000_000) * p.in + (u.tokensOut / 1_000_000) * p.out;
}
