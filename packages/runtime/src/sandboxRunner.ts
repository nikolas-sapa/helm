/**
 * Vercel Sandbox execution path for Helm agents.
 *
 * Activated with HELM_EXECUTION=sandbox. Default stays "host" (execCodex via
 * runner.ts) so nothing breaks without the env var.
 *
 * CRITICAL CONSTRAINT: Codex CLI authenticates locally via ~/.codex/auth.json
 * (a ChatGPT login). That credential does NOT transfer into a Vercel Sandbox.
 * Running `codex` inside a sandbox requires OPENAI_API_KEY. This module
 * enforces that requirement and injects the key, but whether codex-in-sandbox
 * works end-to-end has NOT been verified (no OpenAI key available in this
 * environment). The sandbox lifecycle itself (create → runCommand → stop) IS
 * verified working — see spikes/FINDINGS.md.
 *
 * What IS verified:
 *   - @vercel/sandbox@2.1.1 can create a sandbox and run trivial commands
 *     (node -e "console.log('SANDBOX_OK')") successfully.
 *
 * What is NOT verified:
 *   - `codex exec` running inside the sandbox (requires OPENAI_API_KEY).
 */

import { Sandbox } from "@vercel/sandbox";
import type { PriceTable, RunResult } from "@helm/core";
import { parseCodexEvents } from "./codex.js";
import { assembleResult } from "./capture.js";

export interface SandboxRunOptions {
  prompt: string;
  model?: string;
  timeoutMs?: number;
  prices?: PriceTable;
  /**
   * Environment variables to inject into the sandbox (e.g. CONVEX_URL,
   * CONVEX_DEPLOY_KEY). OPENAI_API_KEY is injected automatically from
   * process.env and is required.
   */
  env?: Record<string, string>;
}

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT = 120_000;

/**
 * Returns true when HELM_EXECUTION env var is set to "sandbox".
 * Exported so callers can branch without hard-coding the string.
 */
export function isSandboxMode(): boolean {
  return process.env.HELM_EXECUTION === "sandbox";
}

/**
 * Run a Codex-powered agent inside a Vercel Sandbox.
 *
 * Requires OPENAI_API_KEY in the host environment — Codex cannot authenticate
 * via the local ChatGPT login inside an isolated VM.
 *
 * The sandbox lifecycle: create → inject env (incl. OPENAI_API_KEY) → run
 * `codex exec` → parse JSONL events → stop sandbox → return RunResult.
 *
 * UNVERIFIED PATH: This function's codex execution step cannot be verified
 * without an OPENAI_API_KEY. Only the sandbox create/run/stop lifecycle has
 * been verified live.
 */
export async function runCodexAgentInSandbox(opts: SandboxRunOptions): Promise<RunResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error(
      "[HELM] HELM_EXECUTION=sandbox requires OPENAI_API_KEY. " +
        "The local Codex auth (~/.codex/auth.json) does not transfer into a Vercel Sandbox. " +
        "Set OPENAI_API_KEY and retry.",
    );
  }

  const model = opts.model ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const startedAt = Date.now();

  let sandbox: Sandbox | undefined;
  try {
    sandbox = await Sandbox.create({
      runtime: "node22",
      timeout: timeoutMs,
      env: {
        ...opts.env,
        OPENAI_API_KEY: openaiKey,
      },
    });

    // Write prompt to a temp file then pipe it into codex exec.
    // codex exec reads from stdin when the last arg is "-".
    await sandbox.writeFiles([{ path: "/vercel/sandbox/prompt.txt", content: opts.prompt }]);

    // UNVERIFIED: codex is not pre-installed in the Vercel Sandbox base image.
    // A production implementation would need to install it (npm i -g @openai/codex
    // or ship a bundle). This invocation is structurally correct but will fail
    // until codex is available in the sandbox environment.
    const result = await sandbox.runCommand("sh", [
      "-c",
      `cat /vercel/sandbox/prompt.txt | codex exec --json --skip-git-repo-check -m ${model} -`,
    ]);

    const exitCode = result.exitCode;
    const stdout = await result.stdout();

    if (exitCode !== 0) {
      const stderr = await result.stderr();
      return assembleResult(
        {
          output: null,
          usage: { tokensIn: 0, tokensOut: 0, model },
          toolCalls: [],
          durationMs: Date.now() - startedAt,
          error: `codex exec exited ${exitCode}: ${stderr.slice(0, 500)}`,
        },
        opts.prices,
      );
    }

    const { output, usage } = parseCodexEvents(stdout, model);
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
  } finally {
    // Always tear down — no leaked sandboxes regardless of outcome.
    if (sandbox) {
      await sandbox.stop().catch(() => {
        // swallow stop errors; the sandbox will auto-expire via its timeout
      });
    }
  }
}
