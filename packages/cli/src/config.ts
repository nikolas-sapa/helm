import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

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
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "config.json"), JSON.stringify(cfg, null, 2));
}
