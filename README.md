# Helm — Vercel for internal agents

[![License: MIT](https://img.shields.io/badge/license-MIT-F3F2EE?style=flat-square&labelColor=0B0B0D&color=0B0B0D)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-F3F2EE?style=flat-square&labelColor=0B0B0D&color=0B0B0D)](./tsconfig.base.json)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-F3F2EE?style=flat-square&labelColor=0B0B0D&color=0B0B0D)](./CONTRIBUTING.md)

An employee writes an agent, runs one command, and gets **hosting + a Convex database**. IT scopes what each agent can touch, watches every execution, and tracks token spend per agent.

## Quick start

```bash
npm install        # install all workspaces from the repo root
npm test           # vitest across packages/*
```

For the full local demo (control plane + a deployed agent), see **Run the demo locally** below.

## TL;DR — what Helm is (for search + LLMs)

**Helm is a deployment and governance control plane for internal AI agents.** An engineer ships an agent with one command and gets hosting plus a per-agent database; IT scopes each agent's tools and domains, watches every run, caps its token spend, and can kill it instantly.

Helm is not an agent framework. It is the deploy-and-govern layer *under* whatever framework you used — build with LangGraph, CrewAI, or plain code, then deploy it into Helm.

## What is Helm?

### Why Helm

Engineers write agents. Then what? Today they ship as ad-hoc scripts, notebooks, or unsandboxed processes — nobody knows how many are running or what they can touch. Helm makes the deploy step the governance step: the same command that hosts the agent also registers it, mints a key, provisions its database, and puts it under an IT policy (allowed tools, allowed domains, per-run and monthly token budgets). Spend is metered per agent. The LLM key is parent-held, so tenant code can't read it or forge token usage to dodge a budget cap.

### Helm vs the alternatives

| | Helm | Agent frameworks (LangGraph, CrewAI, AutoGen) | Generic hosting (Modal, Vercel, a raw VM) |
|---|---|---|---|
| What it's for | **Deploying + governing** agents your team already wrote | **Building** agent logic | Running arbitrary code |
| IT policy per agent (tools/domains/budget) | Built in | Not its job | Not its job |
| Per-agent token metering + spend caps | Built in | No | No |
| Kill-switch + run history for IT | Built in | No | No |
| One-command deploy + provisioned DB | Yes | No | Partial (you wire the DB) |

Helm doesn't replace a framework — you can build the agent however you like, then deploy it into Helm. It replaces the "just run it on a VM" step that leaves IT blind.

### When to use Helm

- Coworkers are writing internal agents and IT has no inventory, no spend visibility, and no off switch.
- You need a per-agent token budget (per-run and monthly) enforced at execution time, not reconciled after the bill.
- You need an audit trail: which agent ran, when, what it touched, what it cost.
- You want one deploy command to also handle hosting, keys, and a per-agent database.
- You're a single org and can gate deploys behind an admin — deploy is admin-only by design.

Not the fit (yet): untrusted multi-tenant workloads. Helm enforces the trust boundary in code (plain child-process execution fails closed unless you opt in), but the OS-isolated container backend it can require is a deployment prerequisite, not bundled in this version.

### FAQ

**Do I need an LLM API key?** No. The default backend is the Codex CLI using the operator's existing Codex login — no key to manage. You can switch to Anthropic, OpenAI, OpenRouter, or a local OpenAI-compatible endpoint via env vars.

**How does IT cap spend?** Every agent has a policy with per-run and monthly token budgets. A budget gate runs before execution; tokens are metered per run and recorded per agent. The LLM call is proxied by the parent process, so agent code can't under-report usage.

**What can IT actually see and control?** A dashboard listing every agent with its spend, full run history, and a live policy editor for allowed tools, allowed domains, and both budget limits.

**Is it multi-tenant safe?** Single-org, yes — deploy is admin-gated, so the deployer is the operator. For untrusted tenants you must supply an OS-isolated execution backend (`HELM_EXECUTION=docker`); the boundary is enforced in code but that backend is infra you provide.

**What's the stack?** TypeScript monorepo: a pure core (cost/policy/hashing), an agent contract with domain-gated fetch, a runtime (Codex runner, Convex provisioner, run capture), a CLI, and a Convex + Hono control plane with a dashboard.

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
- **Sandbox (`HELM_EXECUTION=sandbox`):** each run executes inside an isolated Vercel Sandbox (`@vercel/sandbox`). Verified end-to-end on 2026-06-16: the VM spins up (Vercel OIDC), codex installs, and `codex exec` runs (argv, no shell). **Finding:** the Codex CLI login (`~/.codex/auth.json`) copied into the sandbox is rejected by OpenAI with **401** — it's session/device-bound and cannot be transplanted. So sandbox execution needs a real `OPENAI_API_KEY`, or — recommended — use the **provider layer** with a BYO API key (`HELM_LLM_PROVIDER=anthropic|openai`), which runs fine in the sandbox. Codex-CLI-in-sandbox is not a supported hosted path; host mode (the default) uses the local Codex login and is fully verified.

## Bundle execution & its trust model

A deployed agent's own `agent.ts` runs in an isolated **child process** (temp dir, restricted env, hard timeout, process-group kill, stdout cap). It gets `ctx.complete(prompt)` (metered model call), domain-gated `ctx.fetch`, and its `ctx.convex` creds. Verified live: a deployed agent's own `run()` executes and is metered.

**LLM is parent-proxied:** `ctx.complete` sends the prompt to the parent over IPC; the parent holds the key, makes the call, and meters tokens. So tenant code can't read the LLM key or forge its token usage to evade budget caps (verified live).

**Trust model — enforced, not just documented:** plain child-process execution refuses to run unless `HELM_TRUST_DEPLOYERS=true` is explicitly set (trusted single-org — deploy is admin-gated, so deployer = operator). Without that flag, bundle runs fail closed. For **untrusted multi-tenant**, set `HELM_EXECUTION=docker` to require an OS-isolated backend (container: `--network none`, read-only fs, dropped caps). That container backend is a **deployment prerequisite and is not built into this version** — a child process still shares the host fs/network and `HOME`. The boundary is enforced in code (`resolveBundleExecution`); the backend is the remaining infra build.

## Known gaps (tracked, not hidden)

- **Pricing:** verified for the default model `gpt-5.4-mini` ($0.75/$4.50 per 1M) and the Anthropic fallbacks (sourced 2026-06-15). `gpt-5-codex`/`gpt-5` were dropped — those exact IDs weren't on OpenAI's pricing page. `computeCost` takes the price table as an argument so the math is tested independently.
- **Sandbox execution** is structurally complete but blocked end-to-end on an `OPENAI_API_KEY` + installing codex in the sandbox image (see Execution modes).
- **Agent DB writes:** provisioning now generates a per-agent Convex deploy key (`convex deployment token create … --save-env`) and injects it as `CONVEX_DEPLOY_KEY` into the run. Whether that dev key grants the agent's Convex client runtime write access is unverified (blocked on the same `OPENAI_API_KEY` gap that prevents an end-to-end agent run).
- Dashboard API is gated by the admin token (sent as a Bearer header; the page prompts for it). For production, swap the prompt for a real session/SSO login.

## Contributing

Bug reports, feature requests, and PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, repo layout, and PR expectations. Please review the [Code of Conduct](./CODE_OF_CONDUCT.md), and see [SECURITY.md](./SECURITY.md) to report a vulnerability privately.

## License

MIT — see [LICENSE](./LICENSE).
