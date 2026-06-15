import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { ProvisionApi } from "@helm/runtime";

/**
 * Real Convex provisioner: creates a dedicated per-agent project + cloud dev
 * deployment by running `convex dev --once --configure new` in a temp dir, then
 * reading the generated .env.local for the deployment URL.
 *
 * Note: .env.local yields CONVEX_URL but not an admin/deploy key, so adminKey is
 * returned empty for now — wiring a deploy key for agent DB writes is a tracked
 * follow-up (see spikes/FINDINGS.md). The agent still gets its own isolated DB
 * and URL.
 */
export const convexProvisioner: ProvisionApi = {
  async createProject(agentId: string) {
    const slug = sanitizeSlug(agentId);
    const dir = mkdtempSync(join(tmpdir(), "helm-provision-"));
    try {
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: slug, version: "0.0.0", private: true, dependencies: { convex: "1.40.0" } }),
      );
      await run("npm", ["install", "--no-audit", "--no-fund"], dir, 120_000);
      await run(
        "npx",
        ["convex", "dev", "--once", "--configure", "new", "--project", slug, "--dev-deployment", "cloud"],
        dir,
        180_000,
      );
      const url = readEnvVar(join(dir, ".env.local"), "CONVEX_URL");
      if (!url) throw new Error("provisioning produced no CONVEX_URL");
      return { projectId: slug, url, adminKey: "" };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
};

function sanitizeSlug(agentId: string): string {
  const base = agentId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return `helm-${base || "agent"}-${randomBytes(2).toString("hex")}`;
}

function readEnvVar(path: string, name: string): string | undefined {
  if (!existsSync(path)) return undefined;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(new RegExp(`^${name}=(.*)$`));
    if (m) return m[1].trim();
  }
  return undefined;
}

function run(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}: ${stderr.slice(0, 400)}`));
    });
  });
}
