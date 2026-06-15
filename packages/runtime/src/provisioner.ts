export interface ProvisionApi {
  createProject(agentId: string): Promise<{ projectId: string; url: string; adminKey: string }>;
}

export interface Shared {
  url: string;
  adminKey: string;
}

export interface Provisioned {
  projectId?: string;
  url: string;
  adminKey: string;
  namespace?: string;
}

/**
 * Provision a Convex backend for an agent. Tries a dedicated per-agent project
 * via the management API; if that is unavailable (no public API / quota), falls
 * back to a shared deployment with a per-agent table namespace. The concrete
 * `ProvisionApi` is wired from spikes/FINDINGS.md once Convex auth exists.
 */
/**
 * Derive a collision-free table namespace from an agent id. A lossy transform
 * (e.g. replacing non-alphanumerics with "_") would map distinct ids like
 * "agent-1" and "agent.1" to the same namespace and cross-contaminate tenants —
 * unacceptable for the isolation guarantee. Hex-encoding the raw bytes is
 * injective, so distinct ids always yield distinct namespaces, and the result
 * is a valid identifier prefix.
 */
export function namespaceFor(agentId: string): string {
  return "ns_" + Buffer.from(agentId, "utf8").toString("hex");
}

export async function provisionWith(
  api: ProvisionApi,
  agentId: string,
  shared?: Shared,
): Promise<Provisioned> {
  try {
    return await api.createProject(agentId);
  } catch (e) {
    if (!shared) throw e;
    return {
      url: shared.url,
      adminKey: shared.adminKey,
      namespace: namespaceFor(agentId),
    };
  }
}
