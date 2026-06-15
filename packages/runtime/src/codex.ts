import type { Usage } from "@helm/core";

/**
 * Parse the JSONL event stream emitted by `codex exec --json`. We only depend on
 * two event shapes (locked in spikes/FINDINGS.md):
 *   - { type: "item.completed", item: { type: "agent_message", text } }  -> output
 *   - { type: "turn.completed", usage: { input_tokens, output_tokens, reasoning_output_tokens } }
 * Unknown event types are ignored so new Codex versions don't break parsing.
 */
export interface CodexResult {
  output: string;
  usage: Usage;
}

export function parseCodexEvents(jsonl: string, model: string): CodexResult {
  let output = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let sawUsage = false;

  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let ev: any;
    try {
      ev = JSON.parse(trimmed);
    } catch {
      continue; // tolerate non-JSON noise lines
    }
    if (ev?.type === "item.completed" && ev.item?.type === "agent_message") {
      output = String(ev.item.text ?? "");
    } else if (ev?.type === "turn.completed" && ev.usage) {
      sawUsage = true;
      tokensIn = Number(ev.usage.input_tokens ?? 0);
      tokensOut =
        Number(ev.usage.output_tokens ?? 0) +
        Number(ev.usage.reasoning_output_tokens ?? 0);
    }
  }

  if (!sawUsage) throw new Error("codex: no turn.completed usage event found");
  return { output, usage: { tokensIn, tokensOut, model } };
}
