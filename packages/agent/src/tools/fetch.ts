import { evaluateDomain, type Policy } from "@helm/core";

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Wrap a fetch implementation so it refuses any URL whose host is not in the
 * agent's allowed-domains policy. This is the PRIMARY domain gate (tool-layer),
 * since sandbox network egress restriction is only best-effort.
 */
export function makeFetchTool(policy: Policy, under: FetchFn = fetch): FetchFn {
  return async (url, init) => {
    if (!evaluateDomain(policy, url)) throw new Error(`domain not allowed: ${url}`);
    return under(url, init);
  };
}
