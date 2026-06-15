import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ConvexHttpClient } from "convex/browser";
import { hashBundle, evaluateBudget, type Policy } from "@helm/core";
import { hashKey, verifyKey, redactInput, runCodexAgent, provisionWith } from "@helm/runtime";
import { api } from "../convex/_generated/api.js";
import { convexProvisioner } from "./convexProvisioner.js";

// --- env: load CONVEX_URL from .env.local if not already in process.env ---
const here = dirname(fileURLToPath(import.meta.url));
function loadConvexUrl(): string {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  const envPath = join(here, "..", ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^CONVEX_URL=(.*)$/);
      if (m) return m[1].trim();
    }
  }
  throw new Error("CONVEX_URL not set and not found in .env.local");
}

function loadEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = join(here, "..", ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(new RegExp(`^${name}=(.*)$`));
      if (m) return m[1].trim();
    }
  }
  return undefined;
}

const convex = new ConvexHttpClient(loadConvexUrl());
const PORT = Number(process.env.PORT ?? 8787);
const BASE = process.env.HELM_BASE_URL ?? `http://localhost:${PORT}`;

// Shared secret the trusted server presents to gated Convex functions. Must
// match the deployment's HELM_ADMIN_TOKEN env var.
const ADMIN_TOKEN = loadEnvVar("HELM_ADMIN_TOKEN");
if (!ADMIN_TOKEN) {
  throw new Error("HELM_ADMIN_TOKEN not set (process.env or .env.local) — refusing to start");
}

const app = new Hono();

const DASHBOARD_HTML = readFileSync(join(here, "dashboard.html"), "utf8");

app.get("/health", (c) => c.json({ ok: true }));
app.get("/", (c) => c.html(DASHBOARD_HTML));

// ---- Dashboard read/write API (server holds the admin token) ----

app.get("/api/agents", async (c) => {
  const agents = await convex.query(api.agents.list, { adminToken: ADMIN_TOKEN! });
  const withStats = await Promise.all(
    agents.map(async (a) => {
      const stats = await convex.query(api.runs.statsByAgent, {
        agentId: a._id,
        adminToken: ADMIN_TOKEN!,
      });
      return {
        id: a._id,
        name: a.name,
        slug: a.slug,
        status: a.status,
        model: a.model ?? null,
        convexUrl: a.convexUrl ?? null,
        stats,
      };
    }),
  );
  return c.json({ agents: withStats });
});

app.get("/api/agents/:slug", async (c) => {
  const slug = c.req.param("slug");
  const found = await convex.query(api.agents.getBySlug, { slug, adminToken: ADMIN_TOKEN! });
  if (!found?.agent) return c.json({ error: "not found" }, 404);
  const runs = await convex.query(api.runs.listByAgent, {
    agentId: found.agent._id,
    adminToken: ADMIN_TOKEN!,
  });
  const stats = await convex.query(api.runs.statsByAgent, {
    agentId: found.agent._id,
    adminToken: ADMIN_TOKEN!,
  });
  return c.json({
    agent: {
      id: found.agent._id,
      name: found.agent.name,
      slug: found.agent.slug,
      status: found.agent.status,
      model: found.agent.model ?? null,
      convexUrl: found.agent.convexUrl ?? null,
    },
    policy: found.policy,
    stats,
    runs,
  });
});

app.post("/api/agents/:slug/policy", async (c) => {
  const slug = c.req.param("slug");
  const found = await convex.query(api.agents.getBySlug, { slug, adminToken: ADMIN_TOKEN! });
  if (!found?.agent) return c.json({ error: "not found" }, 404);
  const b = await c.req.json<{
    allowedTools: string[];
    allowedDomains: string[];
    perRunTokenCeiling: number;
    monthlyTokenCap: number;
  }>();
  await convex.mutation(api.agents.setPolicy, {
    adminToken: ADMIN_TOKEN!,
    agentId: found.agent._id,
    allowedTools: b.allowedTools,
    allowedDomains: b.allowedDomains,
    perRunTokenCeiling: b.perRunTokenCeiling,
    monthlyTokenCap: b.monthlyTokenCap,
  });
  return c.json({ ok: true });
});

/** Admin gate for control-plane management endpoints (deploy, policy, etc.). */
function isAdmin(c: { req: { header: (n: string) => string | undefined } }): boolean {
  const presented = (c.req.header("x-helm-admin") ?? "").trim();
  return presented.length > 0 && presented === ADMIN_TOKEN;
}

/** Deploy: register an agent, mint a key, create default policy + deployment. */
app.post("/api/deploy", async (c) => {
  if (!isAdmin(c)) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{
    name: string;
    files: { path: string; content: string }[];
    model?: string;
  }>();
  if (!body?.name || !Array.isArray(body.files)) {
    return c.json({ error: "name and files[] required" }, 400);
  }
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bundleHash = hashBundle(body.files);
  const key = "helm_" + randomBytes(24).toString("hex");

  // Provision the agent's own Convex DB first. Fail loud if it errors, so we
  // never register a half-deployed agent without its database.
  let provisioned;
  try {
    provisioned = await provisionWith(convexProvisioner, slug);
  } catch (e) {
    return c.json(
      { error: "convex provisioning failed", detail: e instanceof Error ? e.message : String(e) },
      502,
    );
  }

  const agentId = await convex.mutation(api.agents.create, {
    adminToken: ADMIN_TOKEN!,
    name: body.name,
    slug,
    // ownerId derived from the verified admin identity, never from the body.
    ownerId: "admin",
    keyHash: hashKey(key),
    model: body.model,
    bundleHash,
    convexUrl: provisioned.url,
    convexProjectId: provisioned.projectId,
  });

  return c.json({
    agentId,
    slug,
    agentUrl: `${BASE}/a/${slug}/run`,
    key,
    convexUrl: provisioned.url,
  });
});

/** Ingress: authenticate, gate on budget, run the agent, record spend. */
app.post("/a/:slug/run", async (c) => {
  const slug = c.req.param("slug");
  const auth = c.req.header("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");

  const found = await convex.query(api.agents.getBySlug, { slug, adminToken: ADMIN_TOKEN! });
  if (!found?.agent) return c.json({ error: "agent not found" }, 404);
  const { agent, policy: rawPolicy } = found;
  if (agent.status !== "active") return c.json({ error: "agent disabled" }, 403);
  if (!verifyKey(token, agent.keyHash)) return c.json({ error: "unauthorized" }, 401);
  if (!rawPolicy) return c.json({ error: "no policy" }, 500);

  const policy: Policy = {
    agentId: agent._id,
    allowedTools: rawPolicy.allowedTools,
    allowedDomains: rawPolicy.allowedDomains,
    perRunTokenCeiling: rawPolicy.perRunTokenCeiling,
    monthlyTokenCap: rawPolicy.monthlyTokenCap,
  };

  // Pre-check: monthly cap (per-run ceiling enforced post-hoc below).
  const monthTokens = await convex.query(api.runs.monthTokens, {
    agentId: agent._id,
    adminToken: ADMIN_TOKEN!,
  });
  const pre = evaluateBudget(policy, { runTokens: 0, monthTokens });
  if (!pre.ok) {
    await convex.mutation(api.runs.record, {
      adminToken: ADMIN_TOKEN!,
      agentId: agent._id,
      inputRedacted: "",
      status: "budget_exceeded",
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      toolCalls: [],
      durationMs: 0,
      error: pre.reason,
    });
    return c.json({ status: "budget_exceeded", reason: pre.reason }, 429);
  }

  const parsed = await c.req
    .json<{ input?: string }>()
    .catch((): { input?: string } => ({}));
  const input = parsed.input ?? "";
  const result = await runCodexAgent({ prompt: input, model: agent.model });

  // Post-hoc per-run ceiling enforcement.
  const runTokens = result.usage.tokensIn + result.usage.tokensOut;
  const post = evaluateBudget(policy, { runTokens, monthTokens });
  const status = post.ok ? result.status : "budget_exceeded";

  await convex.mutation(api.runs.record, {
    adminToken: ADMIN_TOKEN!,
    agentId: agent._id,
    inputRedacted: redactInput(input),
    status,
    tokensIn: result.usage.tokensIn,
    tokensOut: result.usage.tokensOut,
    costUsd: result.costUsd,
    toolCalls: result.toolCalls,
    durationMs: result.durationMs,
    error: result.error,
  });

  return c.json({
    status,
    output: result.output,
    usage: result.usage,
    costUsd: result.costUsd,
    durationMs: result.durationMs,
  });
});

serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" }, (info) => {
  console.log(`helm control-plane listening on http://127.0.0.1:${info.port}`);
});
