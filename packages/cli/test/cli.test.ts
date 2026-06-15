import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig, writeConfig } from "../src/config.js";
import { collectFiles } from "../src/collect.js";
import { hashBundle } from "@helm/core";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "helm-cli-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("config", () => {
  it("round-trips config to an injected dir", () => {
    writeConfig({ apiUrl: "https://helm.example", token: "t" }, dir);
    const cfg = readConfig(dir);
    expect(cfg.apiUrl).toBe("https://helm.example");
    expect(cfg.token).toBe("t");
  });
  it("returns defaults when no config exists", () => {
    expect(readConfig(dir).apiUrl).toBe("http://localhost:8787");
  });
  it("writes the credential file owner-only (0600)", () => {
    writeConfig({ apiUrl: "x", token: "secret" }, dir);
    const mode = statSync(join(dir, "config.json")).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe("collectFiles", () => {
  it("collects source files and skips node_modules/.git", () => {
    writeFileSync(join(dir, "agent.ts"), "export default {}");
    writeFileSync(join(dir, "data.json"), "{}");
    mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "pkg", "x.ts"), "skip me");
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, ".git", "config"), "skip");

    const files = collectFiles(dir);
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(["agent.ts", "data.json"]);
  });

  it("produces a stable bundle hash for the same tree", () => {
    writeFileSync(join(dir, "a.ts"), "1");
    const h1 = hashBundle(collectFiles(dir));
    const h2 = hashBundle(collectFiles(dir));
    expect(h1).toBe(h2);
  });
});
