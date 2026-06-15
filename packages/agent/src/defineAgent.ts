import type { FetchFn } from "./tools/fetch.js";

export interface AgentContext {
  fetch: FetchFn; // domain-gated
  convex: { url: string; adminKey: string };
  anthropicApiKey: string;
}

export interface AgentDefinition<I = unknown, O = unknown> {
  run: (input: I, ctx: AgentContext) => Promise<O>;
}

/**
 * Identity helper that gives the user's `agent.ts` a typed contract. The Helm
 * runner imports the default export and calls `.run(input, ctx)` inside the
 * sandbox.
 */
export function defineAgent<I, O>(def: AgentDefinition<I, O>): AgentDefinition<I, O> {
  return def;
}
