# Helm — Vercel for internal agents

An employee writes an agent, runs one command, and gets **hosting + a Convex database**. IT scopes what each agent can touch, watches every execution, and tracks token spend per agent.

Agents reason via a **pluggable LLM backend**. Default is the **Codex CLI — no API key**, using the operator's Codex login. Operators can switch to any API provider by env:

```bash
# default: keyless Codex CLI (nothing to set)
# or bring your own:
HELM_LLM_PROVIDER=anthropic  HELM_LLM_API_KEY=sk-ant-…   HELM_LLM_MODEL=claude-sonnet-4-6
HELM_LLM_PROVIDER=openai     HELM_LLM_API_KEY=sk-…        HELM_LLM_MODEL=gpt-4o-mini
HELM_LLM_PROVIDER=openai     HELM_LLM_API_KEY=sk-or-…     HELM_LLM_BASE_URL=https://openrouter.ai/api/v1  HELM_LLM_MODEL=anthropic/claude-sonnet-4-6
```

`openai` is any OpenAI-compatible endpoint (OpenAI, OpenRouter, local). Unknown/BYO model prices default to $0 cost (tokens still recorded for repricing).

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

## Execution modes

- **Host (default):** `codex exec` runs on the host machine via the local Codex login. Fully verified.
- **Sandbox (`HELM_EXECUTION=sandbox`):** each run executes inside an isolated Vercel Sandbox (`@vercel/sandbox`). The sandbox create→run→stop lifecycle is verified live; codex is invoked as argv (no shell). **Not yet end-to-end**: codex isn't pre-installed in the sandbox base image and in-sandbox execution requires an `OPENAI_API_KEY` (the local ChatGPT login can't transfer). Requiring that key fails loud.

## Known gaps (tracked, not hidden)

- **Pricing:** verified for the default model `gpt-5.4-mini` ($0.75/$4.50 per 1M) and the Anthropic fallbacks (sourced 2026-06-15). `gpt-5-codex`/`gpt-5` were dropped — those exact IDs weren't on OpenAI's pricing page. `computeCost` takes the price table as an argument so the math is tested independently.
- **Sandbox execution** is structurally complete but blocked end-to-end on an `OPENAI_API_KEY` + installing codex in the sandbox image (see Execution modes).
- **Agent DB writes:** provisioning now generates a per-agent Convex deploy key (`convex deployment token create … --save-env`) and injects it as `CONVEX_DEPLOY_KEY` into the run. Whether that dev key grants the agent's Convex client runtime write access is unverified (blocked on the same `OPENAI_API_KEY` gap that prevents an end-to-end agent run).
- Dashboard API is gated by the admin token (sent as a Bearer header; the page prompts for it). For production, swap the prompt for a real session/SSO login.
