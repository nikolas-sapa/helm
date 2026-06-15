import { spawn } from "node:child_process";
import type { PriceTable, RunResult } from "@helm/core";
import { parseCodexEvents } from "./codex.js";
import { assembleResult } from "./capture.js";

export interface RunOptions {
  prompt: string;
  model?: string; // pinned for deterministic metering
  cwd?: string; // agent bundle dir
  timeoutMs?: number;
  prices?: PriceTable;
}

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT = 120_000;

/** Run a Codex-powered agent non-interactively and assemble a metered RunResult. */
export async function runCodexAgent(opts: RunOptions): Promise<RunResult> {
  const model = opts.model ?? DEFAULT_MODEL;
  const startedAt = Date.now();

  let jsonl: string;
  try {
    jsonl = await execCodex(opts.prompt, model, opts.cwd, opts.timeoutMs ?? DEFAULT_TIMEOUT);
  } catch (e) {
    return assembleResult(
      {
        output: null,
        usage: { tokensIn: 0, tokensOut: 0, model },
        toolCalls: [],
        durationMs: Date.now() - startedAt,
        error: e instanceof Error ? e.message : String(e),
      },
      opts.prices,
    );
  }

  try {
    const { output, usage } = parseCodexEvents(jsonl, model);
    return assembleResult(
      { output, usage, toolCalls: [], durationMs: Date.now() - startedAt },
      opts.prices,
    );
  } catch (e) {
    return assembleResult(
      {
        output: null,
        usage: { tokensIn: 0, tokensOut: 0, model },
        toolCalls: [],
        durationMs: Date.now() - startedAt,
        error: e instanceof Error ? e.message : String(e),
      },
      opts.prices,
    );
  }
}

function execCodex(
  prompt: string,
  model: string,
  cwd: string | undefined,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "codex",
      ["exec", "--json", "--skip-git-repo-check", "-m", model, "-"],
      { cwd, stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`codex exec timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`codex exec exited ${code}: ${stderr.slice(0, 500)}`));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
