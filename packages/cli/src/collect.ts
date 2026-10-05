import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join, relative } from "node:path";
import type { BundleFile } from "@helm/core";

const SKIP_DIRS = new Set(["node_modules", ".git", ".helm", "dist", ".next"]);
const KEEP_EXT = /\.(ts|tsx|js|jsx|json|md)$/;

/** Recursively collect deployable source files from a directory as a bundle. */
export function collectFiles(root: string): BundleFile[] {
  const out: BundleFile[] = [];
  walk(root, root, out);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function walk(root: string, dir: string, out: BundleFile[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = lstatSync(full);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(root, full, out);
    } else if (KEEP_EXT.test(entry)) {
      out.push({ path: relative(root, full), content: readFileSync(full, "utf8") });
    }
  }
}
