import { createHash } from "node:crypto";

export interface BundleFile {
  path: string;
  content: string;
}

export function hashBundle(files: BundleFile[]): string {
  const h = createHash("sha256");
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    h.update(f.path);
    h.update("\0");
    h.update(f.content);
    h.update("\0");
  }
  return h.digest("hex");
}
