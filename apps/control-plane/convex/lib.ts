/**
 * Verify a caller-supplied admin token against the deployment env var
 * HELM_ADMIN_TOKEN. These functions are public (callable over the internet via
 * the deployment URL), so every privilege-mutating or data-bearing function
 * MUST gate on this shared secret known only to the trusted Hono control-plane.
 */
export function requireAdmin(token: string | undefined): void {
  const expected = process.env.HELM_ADMIN_TOKEN;
  if (!expected) throw new Error("HELM_ADMIN_TOKEN not configured on deployment");
  if (!token || token !== expected) throw new Error("forbidden");
}
