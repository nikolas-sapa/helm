/**
 * Vercel Sandbox execution path for Helm agents.
 *
 * Activated with HELM_EXECUTION=sandbox. Default stays "host" (execCodex via
 * runner.ts) so nothing breaks without the env var.
 *
 * Activated with HELM_EXECUTION=sandbox. Default stays "host" (execCodex via
 * runner.ts) so nothing breaks without the env var.
 *
 * AUTH: Codex CLI authenticates via the operator's Codex login
 * (~/.codex/auth.json) — NO API key required. This module copies that login
 * file into the sandbox so the CLI works there exactly as it does locally.
 * Override the source path with HELM_CODEX_AUTH. An OPENAI_API_KEY, if set, is
 * also passed through, but it is NOT required — using the CLI login is the
 * default and supported path.
 *
 * What IS verified: @vercel/sandbox can create a sandbox and run commands.
 * What is NOT verified end-to-end here: a full `codex exec` inside the sandbox
 * (needs a live Codex login present at HELM_CODEX_AUTH).
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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
   * CONVEX_DEPLOY_KEY). Auth uses the Codex CLI login by default; no key needed.
   */
  env?: Record<string, string>;
}

/** Path to the Codex CLI login file to copy into the sandbox. */
function codexAuthPath(): string {
  return process.env.HELM_CODEX_AUTH ?? join(homedir(), ".codex", "auth.json");
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
 * Auth uses the Codex CLI login (copied into the sandbox); no API key required.
 */
export async function runCodexAgentInSandbox(opts: SandboxRunOptions): Promise<RunResult> {
  const authPath = codexAuthPath();
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!existsSync(authPath) && !openaiKey) {
    throw new Error(
      `[HELM] sandbox execution needs Codex auth. Expected a Codex login at ${authPath} ` +
        "(set HELM_CODEX_AUTH to override) or an OPENAI_API_KEY. Run `codex login` first.",
    );
  }
  const codexAuth = existsSync(authPath) ? readFileSync(authPath, "utf8") : null;

  const model = opts.model ?? DEFAULT_MODEL;
  // Defense-in-depth: model flows into a subprocess invocation; reject anything
  // outside a safe identifier charset even though it is admin-set.
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error(`[HELM] invalid model id: ${model}`);
  }
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const startedAt = Date.now();

  let sandbox: Sandbox | undefined;
  try {
    sandbox = await Sandbox.create({
      runtime: "node22",
      timeout: timeoutMs,
      // OPENAI_API_KEY passed through only if the operator set one; the CLI
      // login (written below) is the default auth path.
      env: { ...opts.env, ...(openaiKey ? { OPENAI_API_KEY: openaiKey } : {}) },
    });

    // Copy the Codex CLI login into the sandbox so `codex` authenticates the
    // same way it does locally — no API key required.
    if (codexAuth) {
      await sandbox.writeFiles([{ path: "/root/.codex/auth.json", content: codexAuth }]);
    }

    // codex is not in the sandbox base image — install it first (pinned).
    const install = await sandbox.runCommand("npm", ["install", "-g", "@openai/codex@0.139.0"]);
    if (install.exitCode !== 0) {
      const stderr = await install.stderr();
      return assembleResult(
        {
          output: null,
          usage: { tokensIn: 0, tokensOut: 0, model },
          toolCalls: [],
          durationMs: Date.now() - startedAt,
          error: `codex install failed (exit ${install.exitCode}): ${stderr.slice(0, 400)}`,
        },
        opts.prices,
      );
    }

    // Invoke codex directly as argv (no shell) so the prompt and model are
    // discrete arguments and cannot be shell-interpreted — closes command
    // injection. The prompt is passed as codex exec's positional PROMPT arg.
    const result = await sandbox.runCommand("codex", [
      "exec",
      "--json",
      "--skip-git-repo-check",
      "-m",
      model,
      opts.prompt,
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
