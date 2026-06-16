import { describe, it, expect } from "vitest";
import { hasRunnableBundle, runBundle } from "../src/bundleRunner.js";

describe("runBundle path containment", () => {
  const base = {
    input: null,
    policy: {
      agentId: "a",
      allowedTools: [],
      allowedDomains: [],
      perRunTokenCeiling: 1,
      monthlyTokenCap: 1,
    },
    provider: { provider: "codex" as const },
    convex: { url: "", adminKey: "" },
  };

  it("rejects a bundle path that escapes the run dir (..)", async () => {
    await expect(
      runBundle({ ...base, files: [{ path: "../../evil.ts", content: "x" }] }),
    ).rejects.toThrow(/escapes run dir|bad bundle path/i);
  });

  it("rejects an absolute bundle path", async () => {
    await expect(
      runBundle({ ...base, files: [{ path: "/etc/evil", content: "x" }] }),
    ).rejects.toThrow(/bad bundle path|escapes/i);
  });
});

describe("hasRunnableBundle", () => {
  it("detects an agent.ts with a default export", () => {
    expect(
      hasRunnableBundle([{ path: "agent.ts", content: "export default defineAgent({ run(){} })" }]),
    ).toBe(true);
  });
  it("is false for a trivial bundle with no default export", () => {
    expect(hasRunnableBundle([{ path: "agent.ts", content: "const x = 1;" }])).toBe(false);
  });
  it("is false when there is no agent.ts", () => {
    expect(hasRunnableBundle([{ path: "readme.md", content: "export default x" }])).toBe(false);
  });
  it("is empty-safe", () => {
    expect(hasRunnableBundle([])).toBe(false);
  });
});
