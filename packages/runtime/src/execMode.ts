/**
 * Decide how (and whether) a deployed bundle's user code may execute.
 *
 * Running tenant code in a plain child process is only safe when the deployer is
 * trusted (single-org: deploy is admin-gated, so deployer = operator). To prevent
 * accidentally executing UNTRUSTED user code unsandboxed, plain child-process
 * execution must be explicitly opted into with HELM_TRUST_DEPLOYERS=true.
 *
 * For untrusted multi-tenant, set HELM_EXECUTION=docker to require an OS-isolated
 * backend (container: --network none, read-only fs, dropped caps). That backend
 * is a deployment prerequisite — see bundleRunner.ts.
 */
export type BundleExecMode = "docker" | "child";

export interface BundleExecDecision {
  mode: BundleExecMode;
  allowed: boolean;
  reason?: string;
}

export function resolveBundleExecution(
  env: Record<string, string | undefined> = process.env,
): BundleExecDecision {
  if (env.HELM_EXECUTION === "docker") {
    return { mode: "docker", allowed: true };
  }
  if (env.HELM_TRUST_DEPLOYERS === "true") {
    return { mode: "child", allowed: true };
  }
  return {
    mode: "child",
    allowed: false,
    reason:
      "bundle execution refused: running deployer code in a plain child process " +
      "requires HELM_TRUST_DEPLOYERS=true (trusted single-org), or set " +
      "HELM_EXECUTION=docker for OS-isolated execution.",
  };
}
