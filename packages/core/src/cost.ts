import type { Usage } from "./types.js";

export interface ModelPrice {
  in: number; // USD per 1M input tokens
  out: number; // USD per 1M output tokens
}

export type PriceTable = Record<string, ModelPrice>;

/**
 * Operator-verified price table. These numbers are a BILLING path and MUST be
 * confirmed against official pricing pages before relying on spend figures.
 * `computeCost` takes a table argument so the math is tested independently of
 * these specific numbers.
 *
 * Prices last verified: 2026-06-15.
 */
export const PRICES: PriceTable = {
  // model id -> { in, out } USD per 1M tokens

  // OpenAI (primary provider)
  // Source: https://developers.openai.com/api/docs/pricing (retrieved 2026-06-15)
  "gpt-5.4-mini": { in: 0.75, out: 4.50 },

  // Anthropic (fallback provider)
  // Source: https://platform.claude.com/docs/en/docs/about-claude/models/overview (retrieved 2026-06-15)
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
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
