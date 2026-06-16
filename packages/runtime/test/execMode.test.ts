import { describe, it, expect } from "vitest";
import { resolveBundleExecution } from "../src/execMode.js";

describe("resolveBundleExecution", () => {
  it("refuses child-process execution by default (no untrusted code unsandboxed)", () => {
    const d = resolveBundleExecution({});
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/HELM_TRUST_DEPLOYERS|HELM_EXECUTION/);
  });
  it("allows child-process execution when deployers are trusted", () => {
    const d = resolveBundleExecution({ HELM_TRUST_DEPLOYERS: "true" });
    expect(d).toEqual({ mode: "child", allowed: true });
  });
  it("selects the docker isolation backend when requested", () => {
    const d = resolveBundleExecution({ HELM_EXECUTION: "docker" });
    expect(d).toEqual({ mode: "docker", allowed: true });
  });
});
