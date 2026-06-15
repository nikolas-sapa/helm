import { describe, it, expect } from "vitest";
import { redactInput, assembleResult } from "../src/capture.js";
import type { PriceTable } from "@helm/core";

const TEST_PRICES: PriceTable = { "claude-opus-4-8": { in: 5, out: 25 } };

describe("redactInput", () => {
  it("truncates long input and strips obvious secrets", () => {
    const out = redactInput("sk-ant-SECRETKEY12345 " + "x".repeat(500));
    expect(out).not.toContain("SECRETKEY");
    expect(out.length).toBeLessThanOrEqual(200);
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
