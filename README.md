# Helm — Vercel for internal agents

An employee writes an agent, runs one command, and gets **hosting + a Convex database**. IT scopes what each agent can touch, watches every execution, and tracks token spend per agent.

Agents reason via **Codex** (Codex CLI / Codex models); Anthropic is a configured fallback.

## What works today (verified end-to-end against real Codex + Convex)

- `helm deploy` → registers an agent, mints a key, provisions a **dedicated per-agent Convex DB**, sets a default policy
- HTTP run → key auth → **budget gate** → Codex execution → **token metering** → spend recorded per agent
- **IT control plane** (dashboard): agent list with spend, run history, live policy editor (allowed tools / domains / per-run + monthly token budgets)
- Hardened: Convex functions + deploy endpoint gated by a shared admin secret; CLI credential file is `0600`

## Architecture

| Package | Responsibility |
|---|---|
| `@helm/core` | pure logic — token cost (injected price table), policy engine (tools/domains/budget), bundle hashing |
| `@helm/agent` | `defineAgent()` contract employees write against + domain-gated `fetch`; provider-neutral `llm` config |
| `@helm/runtime` | Codex runner (`codex exec` + usage parse), Convex provisioner (+ fallback), run capture/redaction, key auth |
| `@helm/cli` | `helm init / deploy / auth / whoami / set-url` |
| `@helm/control-plane` | Convex schema + functions, Hono ingress + deploy API, dashboard UI |

Specs and plan: `docs/superpowers/`. Spike findings: `spikes/FINDINGS.md`.

## Run the demo locally

Prereqs: `npm install` at the repo root; Codex CLI installed + logged in; `npx convex login` done once.

```bash
# 1. control-plane Convex (first run provisions the platform deployment)
cd apps/control-plane
npx convex dev --once            # pushes schema + functions

# 2. set the shared admin secret on BOTH the deployment and the server env
TOKEN="hadm_$(openssl rand -hex 24)"
npx convex env set HELM_ADMIN_TOKEN "$TOKEN"
echo "HELM_ADMIN_TOKEN=$TOKEN" >> .env.local

# 3. start the control plane (ingress + dashboard) on http://127.0.0.1:8787
npx tsx src/server.ts
```

In another terminal:

```bash
# 4. point the CLI at the control plane and authenticate
npx tsx packages/cli/src/index.ts set-url http://127.0.0.1:8787
npx tsx packages/cli/src/index.ts auth "<the TOKEN from step 2>"

# 5. scaffold + deploy an agent (provisions its own Convex DB)
mkdir my-agent && cd my-agent
npx tsx ../packages/cli/src/index.ts init
npx tsx ../packages/cli/src/index.ts deploy --name "My Agent" --model gpt-5.4-mini
# prints: endpoint, key (shown once), and the agent's Convex URL

# 6. run it
curl -X POST http://127.0.0.1:8787/a/my-agent/run \
  -H "authorization: Bearer <key from step 5>" \
  -H 'content-type: application/json' \
  -d '{"input":"Say hello"}'
```

Open **http://127.0.0.1:8787/** to see the agent, its spend, run history, and edit its policy.

## Tests

```bash
npm test          # 39 unit tests across core / agent / runtime / cli
```

## Known gaps (tracked, not hidden)

- **Pricing is zeroed** in `packages/core/src/cost.ts` (`TODO(verify)`) — cost math is correct but `costUsd` reads $0 until real Codex/Anthropic prices are filled in. Deliberate: no billing numbers from memory.
- **Execution runs `codex` on the host**, not yet inside an isolated Vercel Sandbox — fine for local MVP, required before multi-tenant hosting.
- **Agent DB write auth**: provisioning returns the per-agent Convex URL but not yet a deploy key, so agents can't write to their DB until that's wired (see `spikes/FINDINGS.md`).
- Dashboard API is gated by the admin token (sent as a Bearer header; the page prompts for it). For production, swap the prompt for a real session/SSO login.
