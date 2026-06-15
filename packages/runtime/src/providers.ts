import type { PriceTable, RunResult, Usage } from "@helm/core";
import { assembleResult } from "./capture.js";
import { runCodexAgent } from "./runner.js";
import { runCodexAgentInSandbox, isSandboxMode } from "./sandboxRunner.js";

/**
 * Pluggable LLM backends.
 *  - "codex"     → Codex CLI (no API key; uses the operator's Codex login). Default.
 *  - "anthropic" → Anthropic Messages API (bring your own key)
 *  - "openai"    → any OpenAI-compatible chat API; set baseUrl for OpenRouter etc.
 */
export type ProviderName = "codex" | "anthropic" | "openai";

export interface ProviderConfig {
  provider: ProviderName;
  model?: string;
  apiKey?: string;
  baseUrl?: string; // OpenAI-compatible base, e.g. https://openrouter.ai/api/v1
}

export interface ProviderRunOptions {
  prompt: string;
  prices?: PriceTable;
  timeoutMs?: number;
  /** Extra env injected into the codex child/sandbox (e.g. CONVEX_DEPLOY_KEY). */
  env?: Record<string, string>;
}

const OPENAI_DEFAULT_BASE = "https://api.openai.com/v1";
const ANTHROPIC_BASE = "https://api.anthropic.com/v1/messages";

/** Resolve a provider config from environment, defaulting to keyless Codex CLI. */
export function providerFromEnv(model?: string): ProviderConfig {
  const provider = (process.env.HELM_LLM_PROVIDER as ProviderName) || "codex";
  return {
    provider,
    model: model ?? process.env.HELM_LLM_MODEL,
    apiKey: process.env.HELM_LLM_API_KEY,
    baseUrl: process.env.HELM_LLM_BASE_URL,
  };
}

/** Run a prompt through the configured provider and assemble a metered result. */
export async function runWithProvider(
  cfg: ProviderConfig,
  opts: ProviderRunOptions,
): Promise<RunResult> {
  switch (cfg.provider) {
    case "codex": {
      const runOpts = { prompt: opts.prompt, model: cfg.model, prices: opts.prices, env: opts.env, timeoutMs: opts.timeoutMs };
      return isSandboxMode() ? runCodexAgentInSandbox(runOpts) : runCodexAgent(runOpts);
    }
    case "anthropic":
      return runHttp(() => callAnthropic(cfg, opts.prompt), cfg.model ?? "anthropic", opts.prices);
    case "openai":
      return runHttp(() => callOpenAICompatible(cfg, opts.prompt), cfg.model ?? "openai", opts.prices);
    default:
      throw new Error(`unknown provider: ${(cfg as ProviderConfig).provider}`);
  }
}

async function runHttp(
  call: () => Promise<{ output: string; usage: Usage }>,
  model: string,
  prices?: PriceTable,
): Promise<RunResult> {
  const startedAt = Date.now();
  try {
    const { output, usage } = await call();
    return assembleResult({ output, usage, toolCalls: [], durationMs: Date.now() - startedAt }, prices);
  } catch (e) {
    return assembleResult(
      {
        output: null,
        usage: { tokensIn: 0, tokensOut: 0, model },
        toolCalls: [],
        durationMs: Date.now() - startedAt,
        error: e instanceof Error ? e.message : String(e),
      },
      prices,
    );
  }
}

// ---- Anthropic ----

async function callAnthropic(cfg: ProviderConfig, prompt: string): Promise<{ output: string; usage: Usage }> {
  if (!cfg.apiKey) throw new Error("anthropic provider requires apiKey");
  const model = cfg.model ?? "claude-sonnet-4-6";
  const res = await fetch(ANTHROPIC_BASE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return parseAnthropicResponse(await res.json(), model);
}

export function parseAnthropicResponse(json: any, model: string): { output: string; usage: Usage } {
  const output = (json?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("");
  return {
    output,
    usage: {
      tokensIn: Number(json?.usage?.input_tokens ?? 0),
      tokensOut: Number(json?.usage?.output_tokens ?? 0),
      model: json?.model ?? model,
    },
  };
}

// ---- OpenAI-compatible (OpenAI, OpenRouter, …) ----

async function callOpenAICompatible(cfg: ProviderConfig, prompt: string): Promise<{ output: string; usage: Usage }> {
  if (!cfg.apiKey) throw new Error("openai provider requires apiKey");
  const base = (cfg.baseUrl ?? OPENAI_DEFAULT_BASE).replace(/\/$/, "");
  const model = cfg.model ?? "gpt-4o-mini";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return parseOpenAIResponse(await res.json(), model);
}

export function parseOpenAIResponse(json: any, model: string): { output: string; usage: Usage } {
  return {
    output: String(json?.choices?.[0]?.message?.content ?? ""),
    usage: {
      tokensIn: Number(json?.usage?.prompt_tokens ?? 0),
      tokensOut: Number(json?.usage?.completion_tokens ?? 0),
      model: json?.model ?? model,
    },
  };
}
