import { describe, it, expect } from "vitest";
import { parseCodexEvents } from "../src/codex.js";

// Real event stream captured in the Step-0 spike (spikes/FINDINGS.md).
const FIXTURE = [
  '{"type":"thread.started","thread_id":"019ecb48"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"HELM_OK"}}',
  '{"type":"turn.completed","usage":{"input_tokens":15306,"cached_input_tokens":4992,"output_tokens":7,"reasoning_output_tokens":0}}',
].join("\n");

describe("parseCodexEvents", () => {
  it("extracts the agent message and token usage from real events", () => {
    const r = parseCodexEvents(FIXTURE, "gpt-5-codex");
    expect(r.output).toBe("HELM_OK");
    expect(r.usage).toEqual({ tokensIn: 15306, tokensOut: 7, model: "gpt-5-codex" });
  });

  it("sums reasoning tokens into tokensOut", () => {
    const jsonl =
      '{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":10,"reasoning_output_tokens":40}}';
    const r = parseCodexEvents(jsonl, "m");
    expect(r.usage.tokensOut).toBe(50);
  });

  it("ignores unknown event types and junk lines", () => {
    const jsonl = [
      "not json at all",
      '{"type":"some.future.event","foo":1}',
      '{"type":"item.completed","item":{"type":"agent_message","text":"hi"}}',
      '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":2}}',
    ].join("\n");
    const r = parseCodexEvents(jsonl, "m");
    expect(r.output).toBe("hi");
    expect(r.usage.tokensIn).toBe(1);
  });

  it("throws if no usage event is present so spend is never silently zero", () => {
    const jsonl = '{"type":"item.completed","item":{"type":"agent_message","text":"x"}}';
    expect(() => parseCodexEvents(jsonl, "m")).toThrow(/no turn.completed usage/i);
  });
});
