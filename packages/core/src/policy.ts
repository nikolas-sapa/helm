import type { Policy } from "./types.js";

export function evaluateTool(policy: Policy, tool: string): boolean {
  return policy.allowedTools.includes(tool);
}

export function evaluateDomain(policy: Policy, url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  // Exact-host match only — no suffix matching, so lookalike subdomains
  // (api.github.com.evil.com) are denied.
  return policy.allowedDomains.some((d) => host === d.toLowerCase());
}

export interface BudgetState {
  runTokens: number;
  monthTokens: number;
}

export type BudgetVerdict =
  | { ok: true }
  | { ok: false; reason: "per_run_ceiling" | "monthly_cap" };

export function evaluateBudget(policy: Policy, s: BudgetState): BudgetVerdict {
  if (s.runTokens > policy.perRunTokenCeiling)
    return { ok: false, reason: "per_run_ceiling" };
  if (s.monthTokens >= policy.monthlyTokenCap)
    return { ok: false, reason: "monthly_cap" };
  return { ok: true };
}
