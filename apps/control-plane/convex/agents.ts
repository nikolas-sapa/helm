import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
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
    name: v.string(),
    slug: v.string(),
    ownerId: v.string(),
    keyHash: v.string(),
    model: v.optional(v.string()),
    bundleHash: v.string(),
    convexUrl: v.optional(v.string()),
    convexProjectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

export const setPolicy = mutation({
  args: {
    agentId: v.id("agents"),
    allowedTools: v.array(v.string()),
    allowedDomains: v.array(v.string()),
    perRunTokenCeiling: v.number(),
    monthlyTokenCap: v.number(),
  },
  handler: async (ctx, args) => {
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
