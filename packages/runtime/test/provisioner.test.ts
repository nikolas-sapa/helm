import { describe, it, expect, vi } from "vitest";
import { provisionWith, type ProvisionApi } from "../src/provisioner.js";

describe("provisionWith", () => {
  it("returns creds on success", async () => {
    const api: ProvisionApi = {
      createProject: vi.fn(async () => ({
        projectId: "p1",
        url: "https://p1.convex.cloud",
        adminKey: "k",
      })),
    };
    const res = await provisionWith(api, "agent-1");
    expect(res).toEqual({ projectId: "p1", url: "https://p1.convex.cloud", adminKey: "k" });
  });

  it("falls back to shared+namespaced when createProject rejects", async () => {
    const api: ProvisionApi = {
      createProject: vi.fn(async () => {
        throw new Error("no api");
      }),
    };
    const res = await provisionWith(api, "agent-1", {
      url: "https://shared.convex.cloud",
      adminKey: "shared",
    });
    expect(res.url).toBe("https://shared.convex.cloud");
    expect(res.namespace).toBe("agent_1");
  });

  it("rethrows when no fallback is provided", async () => {
    const api: ProvisionApi = {
      createProject: vi.fn(async () => {
        throw new Error("no api");
      }),
    };
    await expect(provisionWith(api, "agent-1")).rejects.toThrow(/no api/);
  });
});
