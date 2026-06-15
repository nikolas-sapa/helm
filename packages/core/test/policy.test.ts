import { describe, it, expect } from "vitest";
import { evaluateTool, evaluateDomain, evaluateBudget } from "../src/policy.js";
import type { Policy } from "../src/types.js";

const policy: Policy = {
  agentId: "a1",
  allowedTools: ["fetch", "convex"],
  allowedDomains: ["api.github.com"],
  perRunTokenCeiling: 100_000,
  monthlyTokenCap: 5_000_000,
};

describe("evaluateTool", () => {
  it("allows a listed tool", () => expect(evaluateTool(policy, "fetch")).toBe(true));
  it("denies an unlisted tool", () => expect(evaluateTool(policy, "shell")).toBe(false));
});

describe("evaluateDomain", () => {
  it("allows an exact allowed host", () =>
    expect(evaluateDomain(policy, "https://api.github.com/x")).toBe(true));
  it("denies a non-allowed host", () =>
    expect(evaluateDomain(policy, "https://evil.com")).toBe(false));
  it("denies a lookalike subdomain", () =>
    expect(evaluateDomain(policy, "https://api.github.com.evil.com")).toBe(false));
  it("denies a malformed url", () => expect(evaluateDomain(policy, "not a url")).toBe(false));
});

describe("evaluateBudget", () => {
  it("permits a run under both ceiling and cap", () =>
    expect(evaluateBudget(policy, { runTokens: 50_000, monthTokens: 1_000_000 })).toEqual({
      ok: true,
    }));
  it("blocks when per-run ceiling exceeded", () =>
    expect(evaluateBudget(policy, { runTokens: 150_000, monthTokens: 0 })).toEqual({
      ok: false,
      reason: "per_run_ceiling",
    }));
  it("blocks when monthly cap exceeded", () =>
    expect(evaluateBudget(policy, { runTokens: 1, monthTokens: 5_000_000 })).toEqual({
      ok: false,
      reason: "monthly_cap",
    }));
});
