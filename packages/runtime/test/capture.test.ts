import { describe, it, expect } from "vitest";
import { redactInput, assembleResult } from "../src/capture.js";
import type { PriceTable } from "@helm/core";

const TEST_PRICES: PriceTable = { "claude-opus-4-8": { in: 5, out: 25 } };

describe("redactInput", () => {
  it("truncates long input and strips an Anthropic key", () => {
    const out = redactInput("sk-ant-SECRETKEY12345 " + "x".repeat(500));
    expect(out).not.toContain("SECRETKEY");
    expect(out.length).toBeLessThanOrEqual(200);
  });

  it("strips GitHub tokens and JWTs too", () => {
    const ghToken = "ghp_" + "A".repeat(30); // synthetic, matches gh[pos]_ shape
    const jwt = ["eyJhbG", "cGF5bG9hZA", "c2ln"].join("."); // synthetic JWT shape
    const out = redactInput(`${ghToken} ${jwt}`);
    expect(out).not.toContain(ghToken);
    expect(out).not.toContain(jwt);
  });

  it("redacts a secret straddling the 200-char truncation boundary", () => {
    const out = redactInput("y".repeat(190) + "sk-ant-" + "Z".repeat(60));
    expect(out).not.toContain("ZZZ");
  });
});

describe("assembleResult", () => {
  it("computes cost and ok status from a clean outcome", () => {
    const r = assembleResult(
      {
        output: { ok: true },
        usage: { tokensIn: 1_000_000, tokensOut: 1_000_000, model: "claude-opus-4-8" },
        toolCalls: [{ tool: "fetch", allowed: true }],
        durationMs: 1234,
      },
      TEST_PRICES,
    );
    expect(r.status).toBe("ok");
    expect(r.costUsd).toBeGreaterThan(0);
  });

  it("marks blocked when a tool call was denied", () => {
    const r = assembleResult(
      {
        output: null,
        usage: { tokensIn: 0, tokensOut: 0, model: "claude-opus-4-8" },
        toolCalls: [{ tool: "shell", allowed: false }],
        durationMs: 10,
      },
      TEST_PRICES,
    );
    expect(r.status).toBe("blocked");
  });

  it("marks failed when the sandbox errored", () => {
    const r = assembleResult(
      {
        output: null,
        usage: { tokensIn: 0, tokensOut: 0, model: "claude-opus-4-8" },
        toolCalls: [],
        durationMs: 10,
        error: "sandbox timeout",
      },
      TEST_PRICES,
    );
    expect(r.status).toBe("failed");
  });
});
