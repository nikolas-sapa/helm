import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const record = mutation({
  args: {
    adminToken: v.string(),
    agentId: v.id("agents"),
    inputRedacted: v.string(),
    status: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costUsd: v.number(),
    toolCalls: v.array(v.object({ tool: v.string(), allowed: v.boolean() })),
    durationMs: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    if (args.tokensIn < 0 || args.tokensOut < 0 || args.costUsd < 0 || args.durationMs < 0) {
      throw new Error("run metrics must be non-negative");
    }
    const { adminToken, ...row } = args;
    return await ctx.db.insert("runs", row);
  },
});

export const listByAgent = query({
  args: { agentId: v.id("agents"), adminToken: v.string() },
  handler: async (ctx, { agentId, adminToken }) => {
    requireAdmin(adminToken);
    return await ctx.db
      .query("runs")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(100);
  },
});

/** 30-day usage stats for one agent — powers the dashboard spend column. */
export const statsByAgent = query({
  args: { agentId: v.id("agents"), adminToken: v.string() },
  handler: async (ctx, { agentId, adminToken }) => {
    requireAdmin(adminToken);
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const recent = await ctx.db
      .query("runs")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .collect();
    let runs = 0;
    let tokensIn = 0;
    let tokensOut = 0;
    let costUsd = 0;
    for (const r of recent) {
      if (r._creationTime < cutoff) break;
      runs += 1;
      tokensIn += r.tokensIn;
      tokensOut += r.tokensOut;
      costUsd += r.costUsd;
    }
    return { runs, tokensIn, tokensOut, costUsd };
  },
});

/** Sum of tokens (in+out) for an agent over the last 30 days — feeds the budget gate. */
export const monthTokens = query({
  args: { agentId: v.id("agents"), adminToken: v.string() },
  handler: async (ctx, { agentId, adminToken }) => {
    requireAdmin(adminToken);
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const recent = await ctx.db
      .query("runs")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .collect();
    let total = 0;
    for (const r of recent) {
      if (r._creationTime < cutoff) break;
      total += r.tokensIn + r.tokensOut;
    }
    return total;
  },
});
