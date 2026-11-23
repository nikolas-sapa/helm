import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serve } from "@hono/node-server";
import { ConvexHttpClient } from "convex/browser";
import { createApp } from "./app.js";
import { convexProvisioner } from "./convexProvisioner.js";

// --- env: load CONVEX_URL from .env.local if not already in process.env ---
const here = dirname(fileURLToPath(import.meta.url));
function loadConvexUrl(): string {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  const envPath = join(here, "..", ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^CONVEX_URL=(.*)$/);
      if (m) return m[1].trim();
    }
  }
  throw new Error("CONVEX_URL not set and not found in .env.local");
}

function loadEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = join(here, "..", ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(new RegExp(`^${name}=(.*)$`));
      if (m) return m[1].trim();
    }
  }
  return undefined;
}

const convex = new ConvexHttpClient(loadConvexUrl());
const PORT = Number(process.env.PORT ?? 8787);
const BASE = process.env.HELM_BASE_URL ?? `http://localhost:${PORT}`;

// Shared secret the trusted server presents to gated Convex functions. Must
// match the deployment's HELM_ADMIN_TOKEN env var.
const ADMIN_TOKEN = loadEnvVar("HELM_ADMIN_TOKEN");
if (!ADMIN_TOKEN) {
  throw new Error("HELM_ADMIN_TOKEN not set (process.env or .env.local) — refusing to start");
}

// Hoist bundle-execution policy vars from .env.local into process.env so
// resolveBundleExecution sees them.
for (const k of ["HELM_TRUST_DEPLOYERS", "HELM_EXECUTION"]) {
  const v = loadEnvVar(k);
  if (v) process.env[k] = v;
}

const app = createApp({
  convex,
  adminToken: ADMIN_TOKEN,
  baseUrl: BASE,
  dashboardHtml: readFileSync(join(here, "dashboard.html"), "utf8"),
  provisioner: convexProvisioner,
});

serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" }, (info) => {
  console.log(`helm control-plane listening on http://127.0.0.1:${info.port}`);
});
