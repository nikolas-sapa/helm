export interface Usage {
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface Policy {
  agentId: string;
  allowedTools: string[]; // e.g. ["fetch", "convex"]
  allowedDomains: string[]; // e.g. ["api.github.com"]
  perRunTokenCeiling: number; // hard kill per run
  monthlyTokenCap: number; // rolling 30-day cap
}

export type RunStatus = "ok" | "failed" | "blocked" | "budget_exceeded";

export interface ToolCall {
  tool: string;
  allowed: boolean;
  arg?: string;
}

export interface RunResult {
  status: RunStatus;
  output?: unknown;
  usage: Usage;
  costUsd: number;
  toolCalls: ToolCall[];
  durationMs: number;
  error?: string;
}
