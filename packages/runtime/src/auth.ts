import { createHash, timingSafeEqual } from "node:crypto";

/** sha256 hex of an agent bearer key, for storage at rest. */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Constant-time compare of a presented key against a stored hash. */
export function verifyKey(key: string, hash: string): boolean {
  const a = Buffer.from(hashKey(key), "hex");
  let b: Buffer;
  try {
    b = Buffer.from(hash, "hex");
  } catch {
    return false;
  }
  return a.length === b.length && timingSafeEqual(a, b);
}
