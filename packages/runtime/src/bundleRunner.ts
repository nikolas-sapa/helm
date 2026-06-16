/**
 * Bundle execution — runs a deployed agent's own `agent.ts` in a child process.
 *
 * SECURITY POSTURE: this is a child process, not a container. It is safe for the
 * CURRENT model where deploy is admin-gated, so the deployer IS the operator
 * (single-trust). Hardening applied: path-traversal containment, secret-stripped
 * env (no server admin token; provider apiKey stripped), process-group kill on
 * timeout, and a stdout cap.
 *
 * LLM calls are PARENT-PROXIED over IPC: the child asks the parent to complete a
 * prompt; the parent holds the key, makes the call, and meters tokens. So tenant
 * code can neither read the LLM key nor forge token usage to evade budget caps.
 *
 * NOT YET safe for UNTRUSTED multi-tenant deployers. The remaining requirement is
 * real OS isolation (container with --network none, read-only fs, dropped caps —
 * or the Vercel Sandbox path): a child process still shares the host fs/network,
 * and HOME exposes operator CLI creds. Containerization resolves these.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import type { PriceTable, Policy, RunResult, ToolCall, Usage } from "@helm/core";
import type { BundleFile } from "@helm/core";
import { assembleResult } from "./capture.js";
import { runWithProvider, type ProviderConfig } from "./providers.js";

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
    const safeRoot = resolve(dir);
    for (const f of opts.files) {
      // Containment: reject absolute paths, null bytes, and any `..` escape.
      if (isAbsolute(f.path) || f.path.includes("\0")) {
        throw new Error(`bad bundle path: ${f.path}`);
      }
      const dest = resolve(safeRoot, f.path);
      const rel = relative(safeRoot, dest);
      if (rel.startsWith("..") || isAbsolute(rel)) {
        throw new Error(`bundle path escapes run dir: ${f.path}`);
      }
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, f.content);
    }
    writeFileSync(join(dir, "__harness.mts"), HARNESS);

    const { result, usage } = await execHarness(dir, opts, model, opts.timeoutMs ?? 120_000);
    return assembleResult(
      {
        output: result.output ?? null,
        usage, // authoritative — metered by the PARENT over IPC, not self-reported
        toolCalls: result.toolCalls ?? [],
        durationMs: Date.now() - startedAt,
        error: result.error,
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
): Promise<{ result: HarnessResult; usage: Usage }> {
  return new Promise((resolveOuter) => {
    // Restricted env: never leak the server's secrets to user code. The provider
    // apiKey is NOT passed — the child never makes LLM calls itself; it asks the
    // parent over IPC, and the parent (which holds the key) makes the call and
    // meters tokens authoritatively. So a malicious bundle cannot read the key
    // nor forge its token usage to evade budget caps.
    const { apiKey: _omit, ...providerSafe } = opts.provider;
    const childEnv: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      HELM_INPUT: JSON.stringify(opts.input ?? null),
      HELM_POLICY: JSON.stringify(opts.policy),
      HELM_PROVIDER: JSON.stringify(providerSafe),
      HELM_CONVEX_URL: opts.convex.url,
      HELM_CONVEX_KEY: opts.convex.adminKey,
    };

    // Authoritative usage, accumulated PARENT-side across the bundle's model calls.
    const usage: Usage = { tokensIn: 0, tokensOut: 0, model };
    const MAX_OUT = 1024 * 1024; // 1 MB cap to protect the parent from OOM

    // node --import tsx makes node the direct child so the IPC channel (fd 'ipc')
    // is reliably available to the harness via process.send/on('message').
    const child = spawn("node", ["--import", "tsx", "__harness.mts"], {
      cwd: dir,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      detached: true,
    });
    let stdout = "";
    let stderr = "";
    const killGroup = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      killGroup();
      resolveOuter({ result: { __helm: true, error: `bundle timed out after ${timeoutMs}ms` }, usage });
    }, timeoutMs);

    // LLM proxy: the child requests a completion; the parent runs the provider
    // (with the real key) and meters the tokens.
    child.on("message", async (msg: unknown) => {
      const m = msg as { t?: string; id?: number; prompt?: string };
      if (m?.t !== "complete" || typeof m.id !== "number") return;
      try {
        const r = await runWithProvider(opts.provider, { prompt: String(m.prompt ?? "") });
        usage.tokensIn += r.usage.tokensIn;
        usage.tokensOut += r.usage.tokensOut;
        usage.model = r.usage.model || usage.model;
        const output = typeof r.output === "string" ? r.output : JSON.stringify(r.output ?? "");
        child.send({ t: "result", id: m.id, ok: r.status !== "failed", output, error: r.error });
      } catch (e) {
        child.send({ t: "result", id: m.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    });

    child.stdout!.on("data", (d) => {
      if (stdout.length < MAX_OUT) stdout += d.toString();
      else killGroup();
    });
    child.stderr!.on("data", (d) => {
      if (stderr.length < MAX_OUT) stderr += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolveOuter({ result: { __helm: true, error: e.message }, usage });
    });
    child.on("close", () => {
      clearTimeout(timer);
      const line = stdout.split("\n").reverse().find((l) => l.includes('"__helm"'));
      if (!line) {
        resolveOuter({ result: { __helm: true, error: `bundle produced no result: ${stderr.slice(0, 300)}` }, usage });
        return;
      }
      try {
        resolveOuter({ result: JSON.parse(line) as HarnessResult, usage });
      } catch {
        resolveOuter({ result: { __helm: true, error: "could not parse bundle result" }, usage });
      }
    });
  });
}

// Child-process harness (TS, ESM). Loads the user's agent and builds a gated
// AgentContext. ctx.complete is proxied to the PARENT over IPC — the child never
// holds the LLM key and never reports its own token counts.
const HARNESS = `import { makeFetchTool } from "@helm/agent";

const input = JSON.parse(process.env.HELM_INPUT || "null");
const policy = JSON.parse(process.env.HELM_POLICY || "{}");
const provider = JSON.parse(process.env.HELM_PROVIDER || "{}");
const convex = { url: process.env.HELM_CONVEX_URL || "", adminKey: process.env.HELM_CONVEX_KEY || "" };

const toolCalls: { tool: string; allowed: boolean }[] = [];

let __reqId = 0;
const __pending = new Map<number, { resolve: (s: string) => void; reject: (e: Error) => void }>();
process.on("message", (m: any) => {
  if (m && m.t === "result" && __pending.has(m.id)) {
    const p = __pending.get(m.id)!; __pending.delete(m.id);
    if (m.ok) p.resolve(m.output); else p.reject(new Error(m.error || "model call failed"));
  }
});
async function complete(prompt: string): Promise<string> {
  if (typeof process.send !== "function") throw new Error("no LLM channel available");
  const id = ++__reqId;
  return new Promise<string>((resolve, reject) => {
    __pending.set(id, { resolve, reject });
    process.send!({ t: "complete", id, prompt: String(prompt) });
  });
}

const fetchTool = makeFetchTool(policy, async (url: string, init?: RequestInit) => {
  toolCalls.push({ tool: "fetch", allowed: true });
  return fetch(url, init);
});

function emit(o: Record<string, unknown>) {
  // Write the result, then tear down the IPC channel and exit — otherwise the
  // open IPC fd keeps the child's event loop alive and it hangs until timeout.
  process.stdout.write(JSON.stringify({ __helm: true, toolCalls, ...o }) + "\\n", () => {
    try { process.disconnect && process.disconnect(); } catch {}
    process.exit(0);
  });
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
