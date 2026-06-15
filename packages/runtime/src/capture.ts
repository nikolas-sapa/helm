import { computeCost, type PriceTable, type RunResult, type ToolCall, type Usage } from "@helm/core";

const SECRET_RE = /sk-ant-[A-Za-z0-9_-]+/g;

/** Redact obvious secrets and truncate, so run records never store raw keys. */
export function redactInput(input: string): string {
  return input.replace(SECRET_RE, "[redacted]").slice(0, 200);
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
