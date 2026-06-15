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

describe("runCodexAgentInSandbox — auth requirements", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalAuth = process.env.HELM_CODEX_AUTH;
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    // Point at a path that does not exist so neither auth source is present.
    process.env.HELM_CODEX_AUTH = "/nonexistent/helm-test/auth.json";
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalAuth === undefined) delete process.env.HELM_CODEX_AUTH;
    else process.env.HELM_CODEX_AUTH = originalAuth;
  });

  it("throws when neither a Codex login nor an OPENAI_API_KEY is available", async () => {
    await expect(runCodexAgentInSandbox({ prompt: "hello" })).rejects.toThrow(
      /Codex auth|codex login/i,
    );
  });

  it("rejects an invalid model id (defense-in-depth)", async () => {
    process.env.OPENAI_API_KEY = "sk-test"; // satisfy the auth check
    await expect(
      runCodexAgentInSandbox({ prompt: "hi", model: "bad model; rm -rf /" }),
    ).rejects.toThrow(/invalid model/i);
  });
});
