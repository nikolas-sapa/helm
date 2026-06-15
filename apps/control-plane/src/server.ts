import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ConvexHttpClient } from "convex/browser";
import { hashBundle, evaluateBudget, type Policy } from "@helm/core";
import { hashKey, verifyKey, redactInput, runCodexAgent } from "@helm/runtime";
import { api } from "../convex/_generated/api.js";

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

const convex = new ConvexHttpClient(loadConvexUrl());
const PORT = Number(process.env.PORT ?? 8787);
const BASE = process.env.HELM_BASE_URL ?? `http://localhost:${PORT}`;

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

/** Deploy: register an agent, mint a key, create default policy + deployment. */
app.post("/api/deploy", async (c) => {
  const body = await c.req.json<{
    name: string;
    files: { path: string; content: string }[];
    ownerId?: string;
    model?: string;
  }>();
  if (!body?.name || !Array.isArray(body.files)) {
    return c.json({ error: "name and files[] required" }, 400);
  }
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bundleHash = hashBundle(body.files);
  const key = "helm_" + randomBytes(24).toString("hex");

  const agentId = await convex.mutation(api.agents.create, {
    name: body.name,
    slug,
    ownerId: body.ownerId ?? "local",
    keyHash: hashKey(key),
    model: body.model,
    bundleHash,
  });

  return c.json({ agentId, slug, agentUrl: `${BASE}/a/${slug}/run`, key });
});

/** Ingress: authenticate, gate on budget, run the agent, record spend. */
app.post("/a/:slug/run", async (c) => {
  const slug = c.req.param("slug");
  const auth = c.req.header("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");

  const found = await convex.query(api.agents.getBySlug, { slug });
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
  const monthTokens = await convex.query(api.runs.monthTokens, { agentId: agent._id });
  const pre = evaluateBudget(policy, { runTokens: 0, monthTokens });
  if (!pre.ok) {
    await convex.mutation(api.runs.record, {
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

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`helm control-plane listening on http://localhost:${info.port}`);
});
