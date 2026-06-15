import type { FetchFn } from "./tools/fetch.js";

/** Which model backend powers the agent's reasoning. Codex is primary; Anthropic is the fallback. */
export type LlmProvider = "codex" | "anthropic";

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  /**
   * API key when the provider is used in headless/API mode (e.g. OPENAI_API_KEY
   * for Codex in a sandbox, or ANTHROPIC_API_KEY for the fallback). Optional
   * because local Codex CLI execution authenticates via the user's ChatGPT
   * login rather than a key.
   */
  apiKey?: string;
}

export interface AgentContext {
  fetch: FetchFn; // domain-gated
  convex: { url: string; adminKey: string };
  llm: LlmConfig;
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
