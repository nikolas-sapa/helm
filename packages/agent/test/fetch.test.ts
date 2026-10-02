import { describe, it, expect, vi } from "vitest";
import { makeFetchTool } from "../src/tools/fetch.js";
import type { Policy } from "@helm/core";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

const policy: Policy = {
  agentId: "a1",
  allowedTools: ["fetch"],
  allowedDomains: ["api.github.com"],
  perRunTokenCeiling: 1,
  monthlyTokenCap: 1,
};

describe("makeFetchTool", () => {
  it("denies fetch when the tool is disabled before network access", async () => {
    const under = vi.fn(async () => new Response("ok"));
    const tool = makeFetchTool({ ...policy, allowedTools: [] }, under);
    await expect(tool("https://api.github.com/zen")).rejects.toThrow(/tool not allowed/i);
    expect(under).not.toHaveBeenCalled();
  });

  it("blocks real redirects to a denied host even with caller follow", async () => {
    let deniedHits = 0;
    const denied = createServer((_req, res) => { deniedHits++; res.end("denied"); });
    await new Promise<void>((resolve) => denied.listen(0, "localhost", resolve));
    const deniedPort = (denied.address() as AddressInfo).port;
    const allowed = createServer((req, res) => {
      if (req.url === "/direct") { res.end("ok"); return; }
      res.writeHead(302, { Location: `http://localhost:${deniedPort}/` });
      res.end();
    });
    await new Promise<void>((resolve) => allowed.listen(0, "127.0.0.1", resolve));
    try {
      const port = (allowed.address() as AddressInfo).port;
      const tool = makeFetchTool({ ...policy, allowedDomains: ["127.0.0.1"] });
      expect(await (await tool(`http://127.0.0.1:${port}/direct`)).text()).toBe("ok");
      await expect(tool(`http://127.0.0.1:${port}/redirect`, { redirect: "follow" })).rejects.toThrow();
      expect(deniedHits).toBe(0);
    } finally {
      allowed.closeAllConnections();
      denied.closeAllConnections();
      await Promise.all([allowed, denied].map((server) =>
        new Promise<void>((resolve) => server.close(() => resolve()))));
    }
  });
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
