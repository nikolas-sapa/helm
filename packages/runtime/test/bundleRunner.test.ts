import { describe, it, expect } from "vitest";
import { hasRunnableBundle } from "../src/bundleRunner.js";

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
