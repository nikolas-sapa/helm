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
      namespace: agentId.replace(/[^a-z0-9]/gi, "_").toLowerCase(),
    };
  }
}
