import type { FetchFn } from "./tools/fetch.js";

/**
 * Which model backend powers the agent's reasoning.
 *  - "codex"     → Codex CLI, authenticates via the operator's Codex login (no key). Default.
 *  - "anthropic" → Anthropic Messages API (bring your own key)
 *  - "openai"    → any OpenAI-compatible API (OpenAI, OpenRouter via baseUrl, …)
 */
export type LlmProvider = "codex" | "anthropic" | "openai";

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  /** API key for API-based providers. Not needed for "codex" (uses the CLI login). */
  apiKey?: string;
  /** Base URL for OpenAI-compatible providers, e.g. https://openrouter.ai/api/v1 */
  baseUrl?: string;
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
