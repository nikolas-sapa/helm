import { homedir } from "node:os";
import { join } from "node:path";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export interface HelmConfig {
  apiUrl: string;
  token?: string;
}

const DEFAULT: HelmConfig = { apiUrl: "http://localhost:8787" };

function configDir(dir?: string): string {
  return dir ?? join(homedir(), ".helm");
}

export function readConfig(dir?: string): HelmConfig {
  const path = join(configDir(dir), "config.json");
  if (!existsSync(path)) return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeConfig(cfg: HelmConfig, dir?: string): void {
  const d = configDir(dir);
  mkdirSync(d, { recursive: true, mode: 0o700 });
  const path = join(d, "config.json");
  // config.json holds the admin token — keep it owner-only. mode on writeFile
  // only applies on creation, so chmod afterwards to fix any pre-existing
  // world-readable file from an earlier version.
  writeFileSync(path, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600);
}
