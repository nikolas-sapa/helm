import { describe, it, expect, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { RunResult } from "@helm/core";
import { hashKey } from "@helm/runtime";
import { createApp, type AppDeps, type ConvexClient } from "../src/app.js";

const ADMIN = "hadm_test_secret";
const AGENT_KEY = "helm_agent_key";

type Call = { fn: string; args: Record<string, unknown> };

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    _id: "agent_1",
    name: "Demo",
    slug: "demo",
    status: "active",
    keyHash: hashKey(AGENT_KEY),
    model: "gpt-5.4-mini",
    convexUrl: "https://demo.convex.cloud",
    convexDeployKey: "dev:demo|key",
    ...overrides,
  };
}

const defaultPolicy = {
  allowedTools: ["fetch"],
  allowedDomains: [],
  perRunTokenCeiling: 1_000,
  monthlyTokenCap: 10_000,
};

function okResult(tokensIn = 10, tokensOut = 5): RunResult {
  return {
    status: "ok",
    output: "hi",
    usage: { tokensIn, tokensOut, model: "gpt-5.4-mini" },
    costUsd: 0.001,
    toolCalls: [],
    durationMs: 12,
  };
}

function setup(opts: {
  agent?: ReturnType<typeof makeAgent> | null;
  policy?: typeof defaultPolicy | null;
  files?: { path: string; content: string }[];
  monthTokens?: number;
  result?: RunResult;
  execEnv?: Record<string, string | undefined>;
  provision?: () => Promise<{ projectId: string; url: string; adminKey: string }>;
} = {}) {
  const calls: Call[] = [];
  const agent = opts.agent === undefined ? makeAgent() : opts.agent;
  const policy = opts.policy === undefined ? defaultPolicy : opts.policy;
  const handle = (ref: unknown, args: Record<string, unknown>) => {
    const fn = getFunctionName(ref as Parameters<typeof getFunctionName>[0]);
    calls.push({ fn, args });
    switch (fn) {
      case "agents:getBySlug":
        return agent ? { agent, policy, files: opts.files ?? [] } : null;
      case "agents:list":
        return agent ? [agent] : [];
      case "runs:statsByAgent":
        return { runs: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 };
      case "runs:listByAgent":
        return [];
      case "runs:monthTokens":
        return opts.monthTokens ?? 0;
      case "agents:create":
        return "agent_new";
      default:
        return null;
    }
  };
  const convex = {
    query: vi.fn(async (ref: unknown, args: Record<string, unknown>) => handle(ref, args)),
    mutation: vi.fn(async (ref: unknown, args: Record<string, unknown>) => handle(ref, args)),
  } as unknown as ConvexClient;
  const runWithProvider = vi.fn(async () => opts.result ?? okResult());
  const runBundle = vi.fn(async () => opts.result ?? okResult());
  const createProject = vi.fn(
    opts.provision ??
      (async () => ({ projectId: "p1", url: "https://new.convex.cloud", adminKey: "dev:new|k" })),
  );
  const deps: AppDeps = {
    convex,
    adminToken: ADMIN,
    baseUrl: "http://helm.test",
    dashboardHtml: "<html>dash</html>",
    provisioner: { createProject },
    runWithProvider: runWithProvider as unknown as AppDeps["runWithProvider"],
    runBundle: runBundle as unknown as AppDeps["runBundle"],
    providerFromEnv: (model?: string) => ({ provider: "codex", model }),
    execEnv: opts.execEnv ?? {},
  };
  const app = createApp(deps);
  const recorded = () => calls.filter((c) => c.fn === "runs:record").map((c) => c.args);
  return { app, calls, recorded, runWithProvider, runBundle, createProject };
}

function run(app: ReturnType<typeof createApp>, body: unknown, key = AGENT_KEY, slug = "demo") {
  return app.request(`/a/${slug}/run`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const runnableBundle = [
  { path: "agent.ts", content: "export default defineAgent({ run: async () => 1 })" },
];

describe("run ingress (/a/:slug/run)", () => {
  it("404s an unknown agent without executing", async () => {
    const s = setup({ agent: null });
    const res = await run(s.app, { input: "x" });
    expect(res.status).toBe(404);
    expect(s.runWithProvider).not.toHaveBeenCalled();
    expect(s.recorded()).toHaveLength(0);
  });

  it("rejects a wrong agent key with 401 and records nothing", async () => {
    const s = setup();
    const res = await run(s.app, { input: "x" }, "helm_wrong");
    expect(res.status).toBe(401);
    expect(s.runWithProvider).not.toHaveBeenCalled();
    expect(s.recorded()).toHaveLength(0);
  });

  it("rejects a missing authorization header with 401", async () => {
    const s = setup();
    const res = await s.app.request("/a/demo/run", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
    expect(s.runWithProvider).not.toHaveBeenCalled();
  });

  it("blocks a disabled agent with 403 before execution", async () => {
    const s = setup({ agent: makeAgent({ status: "disabled" }) });
    const res = await run(s.app, { input: "x" });
    expect(res.status).toBe(403);
    expect(s.runWithProvider).not.toHaveBeenCalled();
    expect(s.recorded()).toHaveLength(0);
  });

  it("returns 401 (not 403) for a disabled agent with a wrong key", async () => {
    const s = setup({ agent: makeAgent({ status: "disabled" }) });
    const res = await run(s.app, { input: "x" }, "helm_wrong");
    expect(res.status).toBe(401);
    expect(s.runWithProvider).not.toHaveBeenCalled();
  });

  it("returns 500 when the agent has no policy", async () => {
    const s = setup({ policy: null });
    const res = await run(s.app, { input: "x" });
    expect(res.status).toBe(500);
    expect(s.runWithProvider).not.toHaveBeenCalled();
  });

  it("denies admission at the monthly cap: 429, zero-token budget_exceeded row, no execution", async () => {
    const s = setup({ monthTokens: 10_000 });
    const res = await run(s.app, { input: "x" });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ status: "budget_exceeded", reason: "monthly_cap" });
    expect(s.runWithProvider).not.toHaveBeenCalled();
    expect(s.recorded()).toEqual([
      expect.objectContaining({
        adminToken: ADMIN,
        agentId: "agent_1",
        status: "budget_exceeded",
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        error: "monthly_cap",
      }),
    ]);
  });

  it("runs, meters and records a successful prompt run", async () => {
    const s = setup({ monthTokens: 100 });
    const res = await run(s.app, { input: "Say hello" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", output: "hi", costUsd: 0.001, durationMs: 12 });
    expect(s.runWithProvider).toHaveBeenCalledWith(
      { provider: "codex", model: "gpt-5.4-mini" },
      {
        prompt: "Say hello",
        env: { CONVEX_URL: "https://demo.convex.cloud", CONVEX_DEPLOY_KEY: "dev:demo|key" },
      },
    );
    expect(s.recorded()).toEqual([
      expect.objectContaining({
        status: "ok",
        tokensIn: 10,
        tokensOut: 5,
        costUsd: 0.001,
        inputRedacted: "Say hello",
      }),
    ]);
  });

  it("redacts secrets from the recorded input", async () => {
    const s = setup();
    await run(s.app, { input: "use key sk-ant-abcdefghijklmnopqrstuvwxyz0123" });
    const [row] = s.recorded();
    expect(row.inputRedacted).not.toContain("sk-ant-abcdefghijklmnopqrstuvwxyz0123");
  });

  it("marks a run that exceeds the per-run ceiling as budget_exceeded", async () => {
    const s = setup({ result: okResult(900, 200) });
    const res = await run(s.app, { input: "x" });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("budget_exceeded");
    expect(s.recorded()).toEqual([
      expect.objectContaining({ status: "budget_exceeded", tokensIn: 900, tokensOut: 200 }),
    ]);
  });

  it("refuses to execute a deployed bundle without HELM_TRUST_DEPLOYERS", async () => {
    const s = setup({ files: runnableBundle, execEnv: {} });
    const res = await run(s.app, { input: "x" });
    expect((await res.json()).status).toBe("failed");
    expect(s.runBundle).not.toHaveBeenCalled();
    expect(s.runWithProvider).not.toHaveBeenCalled();
    expect(s.recorded()[0]).toMatchObject({
      status: "failed",
      tokensIn: 0,
      error: expect.stringMatching(/HELM_TRUST_DEPLOYERS/),
    });
  });

  it("fails closed in HELM_EXECUTION=docker mode (backend not built)", async () => {
    const s = setup({
      files: runnableBundle,
      execEnv: { HELM_EXECUTION: "docker", HELM_TRUST_DEPLOYERS: "true" },
    });
    const res = await run(s.app, { input: "x" });
    expect((await res.json()).status).toBe("failed");
    expect(s.runBundle).not.toHaveBeenCalled();
    expect(s.recorded()[0].error).toMatch(/docker/);
  });

  it("executes a deployed bundle when deployers are trusted", async () => {
    const s = setup({ files: runnableBundle, execEnv: { HELM_TRUST_DEPLOYERS: "true" } });
    const res = await run(s.app, { input: "x" });
    expect((await res.json()).status).toBe("ok");
    expect(s.runBundle).toHaveBeenCalledTimes(1);
    expect(s.runBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        files: runnableBundle,
        input: "x",
        convex: { url: "https://demo.convex.cloud", adminKey: "dev:demo|key" },
        policy: expect.objectContaining({ agentId: "agent_1", perRunTokenCeiling: 1_000 }),
      }),
    );
    expect(s.runWithProvider).not.toHaveBeenCalled();
  });
});

describe("admin API gate", () => {
  const adminRoutes: [string, string][] = [
    ["GET", "/api/agents"],
    ["GET", "/api/agents/demo"],
    ["POST", "/api/agents/demo/policy"],
    ["POST", "/api/agents/demo/status"],
    ["POST", "/api/deploy"],
  ];

  for (const [method, path] of adminRoutes) {
    it(`${method} ${path} rejects missing and wrong admin tokens without touching Convex`, async () => {
      const s = setup();
      for (const headers of [{}, { "x-helm-admin": "wrong" }, { authorization: "Bearer wrong" }]) {
        const res = await s.app.request(path, { method, headers, body: method === "POST" ? "{}" : undefined });
        expect(res.status).toBe(401);
      }
      expect(s.calls).toHaveLength(0);
    });
  }

  it("rejects an agent key presented as the admin token", async () => {
    const s = setup();
    const res = await s.app.request("/api/agents", { headers: { authorization: `Bearer ${AGENT_KEY}` } });
    expect(res.status).toBe(401);
  });

  it("accepts the admin token via x-helm-admin or Bearer", async () => {
    const s = setup();
    for (const headers of [{ "x-helm-admin": ADMIN }, { authorization: `Bearer ${ADMIN}` }]) {
      const res = await s.app.request("/api/agents", { headers });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0]).toMatchObject({ slug: "demo", status: "active" });
      expect(body.agents[0]).not.toHaveProperty("keyHash");
      expect(body.agents[0]).not.toHaveProperty("convexDeployKey");
    }
  });

  it("does not expose keyHash or deploy key in agent detail", async () => {
    const s = setup();
    const res = await s.app.request("/api/agents/demo", { headers: { "x-helm-admin": ADMIN } });
    const body = await res.json();
    expect(body.agent).not.toHaveProperty("keyHash");
    expect(body.agent).not.toHaveProperty("convexDeployKey");
  });

  it("rejects an invalid status value with 400", async () => {
    const s = setup();
    const res = await s.app.request("/api/agents/demo/status", {
      method: "POST",
      headers: { "x-helm-admin": ADMIN, "content-type": "application/json" },
      body: JSON.stringify({ status: "deleted" }),
    });
    expect(res.status).toBe(400);
    expect(s.calls.some((c) => c.fn === "agents:setStatus")).toBe(false);
  });

  it("disables an agent via the status endpoint", async () => {
    const s = setup();
    const res = await s.app.request("/api/agents/demo/status", {
      method: "POST",
      headers: { "x-helm-admin": ADMIN, "content-type": "application/json" },
      body: JSON.stringify({ status: "disabled" }),
    });
    expect(res.status).toBe(200);
    expect(s.calls.find((c) => c.fn === "agents:setStatus")?.args).toEqual({
      adminToken: ADMIN,
      agentId: "agent_1",
      status: "disabled",
    });
  });
});

describe("deploy (/api/deploy)", () => {
  function deploy(app: ReturnType<typeof createApp>, body: unknown) {
    return app.request("/api/deploy", {
      method: "POST",
      headers: { "x-helm-admin": ADMIN, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("requires name and files[]", async () => {
    const s = setup();
    const res = await deploy(s.app, { name: "x" });
    expect(res.status).toBe(400);
    expect(s.createProject).not.toHaveBeenCalled();
  });

  it("does not register an agent when provisioning fails", async () => {
    const s = setup({
      provision: async () => {
        throw new Error("quota");
      },
    });
    const res = await deploy(s.app, { name: "My Agent", files: [] });
    expect(res.status).toBe(502);
    expect((await res.json()).detail).toBe("quota");
    expect(s.calls.some((c) => c.fn === "agents:create")).toBe(false);
  });

  it("registers the agent with a hashed key and server-derived owner", async () => {
    const s = setup();
    const res = await deploy(s.app, {
      name: "My Agent!",
      files: [{ path: "agent.ts", content: "x" }],
      model: "gpt-5.4-mini",
      ownerId: "attacker",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      agentId: "agent_new",
      slug: "my-agent",
      agentUrl: "http://helm.test/a/my-agent/run",
      convexUrl: "https://new.convex.cloud",
    });
    expect(body.key).toMatch(/^helm_[0-9a-f]{48}$/);
    const create = s.calls.find((c) => c.fn === "agents:create")!.args;
    expect(create.ownerId).toBe("admin");
    expect(create.keyHash).toBe(hashKey(body.key));
    expect(JSON.stringify(create)).not.toContain(body.key);
    expect(create.convexDeployKey).toBe("dev:new|k");
  });
});
