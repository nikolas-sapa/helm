import { describe, it, expect, vi } from "vitest";
import { makeFetchTool } from "../src/tools/fetch.js";
import type { Policy } from "@helm/core";

const policy: Policy = {
  agentId: "a1",
  allowedTools: ["fetch"],
  allowedDomains: ["api.github.com"],
  perRunTokenCeiling: 1,
  monthlyTokenCap: 1,
};

describe("makeFetchTool", () => {
  it("calls underlying fetch for an allowed domain", async () => {
    const under = vi.fn(async () => new Response("ok"));
    const tool = makeFetchTool(policy, under);
    const res = await tool("https://api.github.com/zen");
    expect(await res.text()).toBe("ok");
    expect(under).toHaveBeenCalledOnce();
  });
  it("throws and never calls fetch for a disallowed domain", async () => {
    const under = vi.fn(async () => new Response("ok"));
    const tool = makeFetchTool(policy, under);
    await expect(tool("https://evil.com")).rejects.toThrow(/domain not allowed/i);
    expect(under).not.toHaveBeenCalled();
  });
});
