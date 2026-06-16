import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PriceTable, Policy, RunResult, ToolCall, Usage } from "@helm/core";
import type { BundleFile } from "@helm/core";
import { assembleResult } from "./capture.js";
import type { ProviderConfig } from "./providers.js";

const here = dirname(fileURLToPath(import.meta.url));
// repo root = packages/runtime/src -> ../../.. ; the temp run dir lives under it
// so the user's `import "@helm/agent"` resolves via the workspace node_modules.
const REPO_ROOT = join(here, "..", "..", "..");

export interface BundleRunOptions {
  files: BundleFile[];
  input: unknown;
  policy: Policy;
  provider: ProviderConfig;
  convex: { url: string; adminKey: string };
  prices?: PriceTable;
  timeoutMs?: number;
}

/** True when the bundle has an `agent.ts` that default-exports a runnable agent. */
export function hasRunnableBundle(files: BundleFile[]): boolean {
  const entry = files.find((f) => f.path === "agent.ts" || f.path.endsWith("/agent.ts"));
  return !!entry && /export\s+default/.test(entry.content);
}

interface HarnessResult {
  __helm: true;
  output?: unknown;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  toolCalls?: ToolCall[];
  error?: string;
}

/** Execute the user's agent.ts in an isolated child process and meter it. */
export async function runBundle(opts: BundleRunOptions): Promise<RunResult> {
  const model = opts.provider.model ?? "unknown";
  const startedAt = Date.now();
  const runsDir = join(REPO_ROOT, ".helm-runs");
  mkdirSync(runsDir, { recursive: true });
  const dir = mkdtempSync(join(runsDir, "run-"));

  try {
    for (const f of opts.files) {
      const dest = join(dir, f.path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, f.content);
    }
    writeFileSync(join(dir, "__harness.mts"), HARNESS);

    const usage: Usage = { tokensIn: 0, tokensOut: 0, model };
    const out = await execHarness(dir, opts, model, opts.timeoutMs ?? 120_000);

    usage.tokensIn = out.tokensIn ?? 0;
    usage.tokensOut = out.tokensOut ?? 0;
    usage.model = out.model ?? model;
    return assembleResult(
      {
        output: out.output ?? null,
        usage,
        toolCalls: out.toolCalls ?? [],
        durationMs: Date.now() - startedAt,
        error: out.error,
      },
      opts.prices,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function execHarness(
  dir: string,
  opts: BundleRunOptions,
  model: string,
  timeoutMs: number,
): Promise<HarnessResult> {
  return new Promise((resolve) => {
    // Restricted env: never leak the server's secrets to user code. Only what
    // the agent legitimately needs — PATH/HOME (for the codex CLI + module
    // resolution) and the agent's own scoped config.
    const childEnv: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      HELM_INPUT: JSON.stringify(opts.input ?? null),
      HELM_POLICY: JSON.stringify(opts.policy),
      HELM_PROVIDER: JSON.stringify(opts.provider),
      HELM_CONVEX_URL: opts.convex.url,
      HELM_CONVEX_KEY: opts.convex.adminKey,
    };

    const child = spawn("npx", ["tsx", "__harness.mts"], {
      cwd: dir,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ __helm: true, error: `bundle timed out after ${timeoutMs}ms`, model });
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ __helm: true, error: e.message, model });
    });
    child.on("close", () => {
      clearTimeout(timer);
      // The harness prints exactly one JSON line tagged __helm.
      const line = stdout
        .split("\n")
        .reverse()
        .find((l) => l.includes('"__helm"'));
      if (!line) {
        resolve({ __helm: true, error: `bundle produced no result: ${stderr.slice(0, 300)}`, model });
        return;
      }
      try {
        resolve(JSON.parse(line) as HarnessResult);
      } catch {
        resolve({ __helm: true, error: "could not parse bundle result", model });
      }
    });
  });
}

// Child-process harness (TS, ESM). Loads the user's agent, builds a gated +
// metered AgentContext, runs it, and prints a single JSON result line.
const HARNESS = `import { makeFetchTool } from "@helm/agent";
import { runWithProvider } from "@helm/runtime";

const input = JSON.parse(process.env.HELM_INPUT || "null");
const policy = JSON.parse(process.env.HELM_POLICY || "{}");
const provider = JSON.parse(process.env.HELM_PROVIDER || "{}");
const convex = { url: process.env.HELM_CONVEX_URL || "", adminKey: process.env.HELM_CONVEX_KEY || "" };

let tokensIn = 0, tokensOut = 0, model = provider.model || "unknown";
const toolCalls: { tool: string; allowed: boolean }[] = [];

async function complete(prompt: string): Promise<string> {
  const r = await runWithProvider(provider, { prompt });
  tokensIn += r.usage.tokensIn; tokensOut += r.usage.tokensOut; model = r.usage.model || model;
  if (r.status === "failed") throw new Error(r.error || "model call failed");
  return typeof r.output === "string" ? r.output : JSON.stringify(r.output);
}

const fetchTool = makeFetchTool(policy, async (url: string, init?: RequestInit) => {
  toolCalls.push({ tool: "fetch", allowed: true });
  return fetch(url, init);
});

function emit(o: Record<string, unknown>) {
  process.stdout.write(JSON.stringify({ __helm: true, tokensIn, tokensOut, model, toolCalls, ...o }) + "\\n");
}

try {
  const mod = await import("./agent.ts");
  const agent = mod.default;
  if (!agent || typeof agent.run !== "function") {
    emit({ error: "bundle has no defineAgent default export" });
  } else {
    const output = await agent.run(input, { fetch: fetchTool, convex, llm: provider, complete });
    emit({ output });
  }
} catch (e: any) {
  emit({ error: String((e && e.message) || e) });
}
`;
