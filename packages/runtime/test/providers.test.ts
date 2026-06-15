import { describe, it, expect } from "vitest";
import {
  parseAnthropicResponse,
  parseOpenAIResponse,
  runWithProvider,
  providerFromEnv,
} from "../src/providers.js";

describe("parseAnthropicResponse", () => {
  it("extracts text and token usage", () => {
    const r = parseAnthropicResponse(
      {
        model: "claude-sonnet-4-6",
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "world" },
          { type: "thinking", text: "ignored" },
        ],
        usage: { input_tokens: 12, output_tokens: 3 },
      },
      "fallback",
    );
    expect(r.output).toBe("Hello world");
    expect(r.usage).toEqual({ tokensIn: 12, tokensOut: 3, model: "claude-sonnet-4-6" });
  });
});

describe("parseOpenAIResponse", () => {
  it("extracts message content and token usage (OpenAI/OpenRouter shape)", () => {
    const r = parseOpenAIResponse(
      {
        model: "gpt-4o-mini",
        choices: [{ message: { content: "hi there" } }],
        usage: { prompt_tokens: 7, completion_tokens: 2 },
      },
      "fallback",
    );
    expect(r.output).toBe("hi there");
    expect(r.usage).toEqual({ tokensIn: 7, tokensOut: 2, model: "gpt-4o-mini" });
  });
});

describe("providerFromEnv", () => {
  it("defaults to keyless codex when no env is set", () => {
    const prev = process.env.HELM_LLM_PROVIDER;
    delete process.env.HELM_LLM_PROVIDER;
    expect(providerFromEnv("gpt-5.4-mini").provider).toBe("codex");
    if (prev !== undefined) process.env.HELM_LLM_PROVIDER = prev;
  });
});

describe("runWithProvider", () => {
  it("returns a failed result (not a throw) when an API provider lacks a key", async () => {
    const r = await runWithProvider(
      { provider: "anthropic", model: "claude-sonnet-4-6" },
      { prompt: "hi" },
    );
    expect(r.status).toBe("failed");
    expect(r.error).toMatch(/requires apiKey/i);
  });

  it("rejects an unknown provider", async () => {
    await expect(
      // @ts-expect-error intentional bad provider
      runWithProvider({ provider: "bogus" }, { prompt: "hi" }),
    ).rejects.toThrow(/unknown provider/i);
  });
});
