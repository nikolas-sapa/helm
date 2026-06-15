import { computeCost, type PriceTable, type RunResult, type ToolCall, type Usage } from "@helm/core";

// Best-effort secret patterns for the credential shapes this system handles.
// Not exhaustive — defense in depth, not a guarantee. Redaction runs on the
// full string BEFORE truncation so a secret straddling the length cap can't be
// half-stored.
const SECRET_RES: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]+/g, // Anthropic API keys
  /\bsk-[A-Za-z0-9_-]{16,}/g, // generic sk- keys (OpenAI etc.)
  /\bgh[pos]_[A-Za-z0-9]{20,}/g, // GitHub tokens
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWTs (incl. Convex admin keys)
];

/**
 * Strip known secret shapes from input, then truncate, so persisted run records
 * avoid storing recognizable credentials. Best-effort only — callers must not
 * treat this as a guarantee that all secrets are removed.
 */
export function redactInput(input: string): string {
  let out = input;
  for (const re of SECRET_RES) out = out.replace(re, "[redacted]");
  return out.slice(0, 200);
}

export interface SandboxOutcome {
  output: unknown;
  usage: Usage;
  toolCalls: ToolCall[];
  durationMs: number;
  error?: string;
}

/** Turn a sandbox outcome into a persisted run result, computing status + cost. */
export function assembleResult(o: SandboxOutcome, prices?: PriceTable): RunResult {
  const status = o.error
    ? "failed"
    : o.toolCalls.some((t) => !t.allowed)
      ? "blocked"
      : "ok";
  return {
    status,
    output: o.output,
    usage: o.usage,
    costUsd: computeCost(o.usage, prices),
    toolCalls: o.toolCalls,
    durationMs: o.durationMs,
    error: o.error,
  };
}
