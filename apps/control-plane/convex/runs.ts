import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const record = mutation({
  args: {
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
    return await ctx.db.insert("runs", args);
  },
});

export const listByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return await ctx.db
      .query("runs")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(100);
  },
});

/** Sum of tokens (in+out) for an agent over the last 30 days — feeds the budget gate. */
export const monthTokens = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
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
