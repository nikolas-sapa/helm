import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";

export const list = query({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    requireAdmin(adminToken);
    return await ctx.db.query("agents").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string(), adminToken: v.string() },
  handler: async (ctx, { slug, adminToken }) => {
    requireAdmin(adminToken);
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!agent) return null;
    const policy = await ctx.db
      .query("policies")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .unique();
    return { agent, policy };
  },
});

export const create = mutation({
  args: {
    adminToken: v.string(),
    name: v.string(),
    slug: v.string(),
    ownerId: v.string(),
    keyHash: v.string(),
    model: v.optional(v.string()),
    bundleHash: v.string(),
    convexUrl: v.optional(v.string()),
    convexProjectId: v.optional(v.string()),
    convexDeployKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    const agentId = await ctx.db.insert("agents", {
      orgId: null,
      ownerId: args.ownerId,
      name: args.name,
      slug: args.slug,
      status: "active",
      keyHash: args.keyHash,
      model: args.model,
      convexUrl: args.convexUrl,
      convexProjectId: args.convexProjectId,
      convexDeployKey: args.convexDeployKey,
    });
    await ctx.db.insert("deployments", {
      agentId,
      bundleHash: args.bundleHash,
      active: true,
    });
    // Sensible default policy: locked-down tools, generous budget.
    await ctx.db.insert("policies", {
      agentId,
      allowedTools: ["fetch"],
      allowedDomains: [],
      perRunTokenCeiling: 200_000,
      monthlyTokenCap: 50_000_000,
    });
    return agentId;
  },
});

export const setStatus = mutation({
  args: { adminToken: v.string(), agentId: v.id("agents"), status: v.string() },
  handler: async (ctx, { adminToken, agentId, status }) => {
    requireAdmin(adminToken);
    if (status !== "active" && status !== "disabled") {
      throw new Error("status must be 'active' or 'disabled'");
    }
    await ctx.db.patch(agentId, { status });
  },
});

export const setPolicy = mutation({
  args: {
    adminToken: v.string(),
    agentId: v.id("agents"),
    allowedTools: v.array(v.string()),
    allowedDomains: v.array(v.string()),
    perRunTokenCeiling: v.number(),
    monthlyTokenCap: v.number(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    const existing = await ctx.db
      .query("policies")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .unique();
    if (!existing) throw new Error("policy not found for agent");
    await ctx.db.patch(existing._id, {
      allowedTools: args.allowedTools,
      allowedDomains: args.allowedDomains,
      perRunTokenCeiling: args.perRunTokenCeiling,
      monthlyTokenCap: args.monthlyTokenCap,
    });
  },
});
