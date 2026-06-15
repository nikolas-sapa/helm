import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isSandboxMode, runCodexAgentInSandbox } from "../src/sandboxRunner.js";

// Mock @vercel/sandbox so these tests run without Vercel credentials.
vi.mock("@vercel/sandbox", () => ({
  Sandbox: {
    create: vi.fn(),
  },
}));

describe("isSandboxMode", () => {
  const original = process.env.HELM_EXECUTION;
  afterEach(() => {
    if (original === undefined) delete process.env.HELM_EXECUTION;
    else process.env.HELM_EXECUTION = original;
  });

  it("returns false when HELM_EXECUTION is unset (default host mode)", () => {
    delete process.env.HELM_EXECUTION;
    expect(isSandboxMode()).toBe(false);
  });

  it("returns true when HELM_EXECUTION=sandbox", () => {
    process.env.HELM_EXECUTION = "sandbox";
    expect(isSandboxMode()).toBe(true);
  });

  it("returns false for any other value", () => {
    process.env.HELM_EXECUTION = "host";
    expect(isSandboxMode()).toBe(false);
  });
});

describe("runCodexAgentInSandbox — fail-loud without OPENAI_API_KEY", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("throws a clear error when OPENAI_API_KEY is missing", async () => {
    await expect(runCodexAgentInSandbox({ prompt: "hello" })).rejects.toThrow(
      /OPENAI_API_KEY/,
    );
  });

  it("error message names the cause (ChatGPT login doesn't transfer)", async () => {
    await expect(runCodexAgentInSandbox({ prompt: "hello" })).rejects.toThrow(
      /ChatGPT login|auth\.json/,
    );
  });
});
