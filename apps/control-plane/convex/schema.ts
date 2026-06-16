import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    orgId: v.union(v.string(), v.null()),
    ownerId: v.string(),
    name: v.string(),
    slug: v.string(),
    status: v.string(), // "active" | "disabled"
    keyHash: v.string(), // sha256 of bearer key
    model: v.optional(v.string()),
    convexProjectId: v.optional(v.string()),
    convexUrl: v.optional(v.string()),
    convexDeployKey: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  deployments: defineTable({
    agentId: v.id("agents"),
    bundleHash: v.string(),
    files: v.optional(v.array(v.object({ path: v.string(), content: v.string() }))),
    active: v.boolean(),
  }).index("by_agent", ["agentId"]),

  policies: defineTable({
    agentId: v.id("agents"),
    allowedTools: v.array(v.string()),
    allowedDomains: v.array(v.string()),
    perRunTokenCeiling: v.number(),
    monthlyTokenCap: v.number(),
  }).index("by_agent", ["agentId"]),

  runs: defineTable({
    agentId: v.id("agents"),
    deploymentId: v.optional(v.id("deployments")),
    inputRedacted: v.string(),
    status: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costUsd: v.number(),
    toolCalls: v.array(v.object({ tool: v.string(), allowed: v.boolean() })),
    durationMs: v.number(),
    error: v.optional(v.string()),
  }).index("by_agent", ["agentId"]),
});
