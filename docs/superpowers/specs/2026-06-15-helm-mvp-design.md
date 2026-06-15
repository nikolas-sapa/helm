# Helm — MVP Design Spec

**Date:** 2026-06-15
**Codename:** Helm — *the employee steers, IT controls the rudder*
**One-liner:** Vercel for internal agents. An employee writes a Claude agent, runs one command, and gets hosting plus a Convex database. IT scopes what each agent can touch, watches every execution, and tracks token spend per agent.

---

## 1. Problem & Wedge

Companies want employees to build internal agents, but two things block it:

1. **DX is bad** — there is no "git push and it's live" for an agent. People wire up servers, secrets, and a database by hand.
2. **IT won't allow it** — an ungoverned agent with tool access and an API key is a security and cost liability. No scoping, no audit trail, no spend cap.

Helm solves both at once: **one-command deploy for the builder, a control plane for IT.** The wedge is that the governance layer is what unlocks adoption — IT says yes because they get scoping, observability, and per-agent spend out of the box.

---

## 2. MVP Scope (thinnest end-to-end slice)

An employee writes an Agent SDK entrypoint in a repo, runs `helm deploy`, and gets:

- a hosted, HTTP-triggered agent
- an auto-provisioned Convex database wired in
- a run that IT can see, scope, and budget

IT opens a dashboard and can: see every run (input, tools used, tokens, cost, status), set a per-agent policy (allowed tools + allowed outbound domains + token budget), and see spend per agent.

**Explicitly out of scope for MVP** (named so we don't drift): git push-to-deploy, warm pools, cron/queue triggers, RBAC/SSO, traces, anomaly alerts, Convex branching/backups, approval workflows, multi-region.

---

## 3. Locked Architecture Decisions

| Area | Decision | Why |
|---|---|---|
| Trigger model | HTTP/webhook, **ephemeral** | Cheapest, simplest, maps to "Vercel for agents". Cron is a later add-on, not a rewrite. |
| Agent target | **Claude Agent SDK (TypeScript) entrypoint** (`agent.ts`), not headless Claude Code | Claude Code isn't built for headless multi-tenant hosting. Agent SDK gives the same DX pitch with far simpler infra and clean token accounting. |
| Execution sandbox | **Vercel Sandbox** — fresh per run, torn down after | Isolation per execution, no persistent attack surface, pay-per-run. |
| Per-agent database | **Convex**, one project provisioned per agent at deploy time | Matches the pitch ("hosting plus a Convex database in one click"); creds injected as sandbox env vars. |
| Control plane | **Next.js on Vercel** (dashboard + API) | One platform, fast to ship. |
| Platform metadata store | **Convex** (dogfood) — agents, runs, policies, spend | Dogfooding our own DB story; real-time dashboard for free. |
| Spend metering | Token usage returned by every Agent SDK response | Ground truth, not estimation. |
| Policy enforcement | (1) Agent SDK `allowedTools` + permission callback, (2) sandbox egress restriction to allowed domains, (3) token-budget gate that aborts a run over ceiling | Defense in depth; the IT-facing moat. |

---

## 4. Subsystems: MVP vs Later

| Subsystem | MVP | Later |
|---|---|---|
| Deploy pipeline | `helm deploy` CLI: bundle repo, upload, register agent | Git push-to-deploy, preview deploys |
| Agent runtime | Ephemeral Vercel Sandbox + Agent SDK harness | Warm pools, cron, event/queue triggers |
| Convex provisioning | Auto-create one project per agent | Branching, backups, restore |
| IT control plane | Tool allowlist + domain allowlist + token budget | RBAC, SSO, approval flows, org policies |
| Observability + spend | Per-run record: input, tools, tokens, $, status, duration | Step traces, alerts, anomaly detection, exports |

---

## 5. Data Flow (single run)

```
caller (HTTP request, with agent key)
  -> Helm ingress
       - authenticate caller + resolve agent
       - load policy; pre-check token budget remaining
  -> runner
       - spawn fresh Vercel Sandbox
       - inject: Convex creds, policy (allowedTools, allowedDomains), token ceiling
       - run Agent SDK entrypoint
       - tools gated by allowedTools + permission callback
       - egress restricted to allowedDomains
       - budget gate aborts if tokens exceed ceiling mid-run
  -> capture
       - tokens (in/out), computed cost, tool calls, status, duration
       - write run record to control-plane Convex
  -> return response to caller
  -> tear down sandbox
```

---

## 6. Modules (isolated units, one purpose each)

Each unit: **what it does / how it's used / what it depends on.**

- **`helm-cli`** — bundles the user's repo, uploads it, registers/updates the agent, tails logs.
  *Uses:* `helm <init|deploy|logs|whoami>`. *Depends on:* control-plane API.
- **`ingress`** — HTTP entry per agent. Authenticates caller, resolves agent, runs the policy + budget pre-check, hands off to runner.
  *Uses:* `POST /a/:agentId/run`. *Depends on:* `policy`, `runner`, control-plane store.
- **`runner`** — owns sandbox lifecycle and the Agent SDK harness; injects creds + policy; captures usage.
  *Uses:* `run(agent, input, policy) -> { output, usage, toolCalls, status }`. *Depends on:* Vercel Sandbox, Agent SDK, `policy`.
- **`provisioner`** — creates/destroys a Convex project per agent; returns creds.
  *Uses:* `provision(agentId)`, `deprovision(agentId)`. *Depends on:* Convex management API.
- **`policy`** — defines, stores, and evaluates per-agent allowlists (tools, domains) + token budget.
  *Uses:* `get(agentId)`, `set(agentId, policy)`, `evaluate(policy, request)`. *Depends on:* control-plane store.
- **`dashboard`** — Next.js UI: agents list, run detail, spend-per-agent, policy editor.
  *Uses:* IT/builder web UI. *Depends on:* control-plane API + Convex (real-time).

---

## 7. Data Model (control-plane Convex)

- **agent**: `id, ownerId, name, slug, status, convexProjectId, createdAt`
- **deployment**: `id, agentId, bundleHash, createdAt, active`
- **policy**: `agentId, allowedTools[], allowedDomains[], tokenBudget, budgetWindow`
- **run**: `id, agentId, deploymentId, input(redacted), status, tokensIn, tokensOut, costUsd, toolCalls[], startedAt, durationMs, error?`
- **spendRollup**: `agentId, window, tokensIn, tokensOut, costUsd` (derived for fast dashboard)

---

## 8. Error Handling

- **Deploy failures** (bad bundle, Convex provision error) — fail the CLI loudly with the cause; no half-registered agent (provision + register are one transaction; roll back Convex project on register failure).
- **Policy violation at runtime** (disallowed tool/domain) — block the tool call, record it on the run as `blocked`, continue or abort per policy; surfaced in run detail.
- **Budget exceeded** — abort run, mark `status=budget_exceeded`, return a clear error to caller, flag agent in dashboard.
- **Sandbox crash/timeout** — mark run `failed` with reason; always tear down the sandbox (no leaks).
- **Convex unavailable** — run can still execute; run record buffered and retried to control plane (never lose a spend record).

---

## 9. Testing Strategy

- **Unit:** `policy.evaluate` (tool/domain allow + deny, budget math), cost computation from token usage, bundle hashing.
- **Integration:** `runner.run` against a stub Agent SDK that emits scripted tool calls + usage — assert gating, capture, teardown.
- **Provisioner:** mocked Convex management API — assert create/rollback/destroy.
- **E2E (happy path):** `helm deploy` a sample agent, hit its endpoint, assert run record + spend appear in dashboard, policy blocks a disallowed tool.

---

## 10. Success Criteria (MVP is "done" when)

1. `helm deploy` on a sample repo yields a live HTTP agent + a provisioned Convex DB, no manual steps.
2. Hitting the agent runs it in a sandbox and returns a result.
3. The run appears in the dashboard with tokens, cost, tools used, status.
4. IT can set an allowed-tools list and a token budget; a disallowed tool is blocked and an over-budget run is aborted — both visible in the dashboard.
5. Spend-per-agent is correct against Anthropic's reported usage.

---

## 11. Resolved Decisions (grill-me decision log)

| # | Decision | Locked answer |
|---|---|---|
| 1 | Tenancy | Single-org MVP; nullable `orgId` in schema so multi-tenant is additive later. |
| 2 | Caller→agent auth | Per-agent bearer key, hashed at rest, shown once. |
| 3 | Builder auth | Magic-link session for dashboard; CLI device token in `~/.helm/config.json`. |
| 4 | Domain allowlist enforcement | Tool-layer (Helm-wrapped `fetch` checks allowlist), not network egress. Sandbox egress is best-effort only. |
| 5 | Tool gating | Agent SDK `allowedTools` + permission callback is the primary gate; disallowed call recorded as `blocked`. |
| 6 | Agent entrypoint contract | `@helm/agent` package exposing `defineAgent({ run(input, ctx) })`; repo root `agent.ts` default-exports it. `ctx` provides Convex client + wrapped tools. |
| 7 | Convex provisioning | Attempt per-agent project via management API; fallback to shared deployment with per-agent table namespacing. Verified in Step-0 spike. |
| 8 | Token budget | Hard per-run ceiling + rolling monthly cap per agent. |
| 9 | Cost computation | Model-id→price table in `core`; computed from returned token usage. |
| 10 | Ingress/runner host | Next.js route handler on Vercel = ingress + runner orchestration; spawns Vercel Sandbox. |
| 11 | Secret redaction | Run records store truncated/hashed input; injected keys never logged (enforced in `capture`). |
| 12 | MVP tool surface | Wrapped `fetch` (domain-gated), Convex DB client, LLM. Nothing else day one. |
| 13 | Repo layout | npm workspaces monorepo: `packages/{cli,agent,core}`, `apps/dashboard`. |

**Verified (npm):** `@anthropic-ai/claude-agent-sdk@0.3.177`, `@vercel/sandbox@2.2.1`, `convex@1.41.0` all exist and are current.

**Deferred to Step-0 spike (build, not paper):** (a) Vercel Sandbox cold-start + bundle injection, (b) Convex programmatic project creation. Both have fallbacks; neither blocks the plan.

## 12. Open Risks

- **Vercel Sandbox cold-start latency** per run — acceptable for MVP (async/webhook), revisit with warm pools.
- **Egress restriction fidelity** — sandbox-level domain allowlisting may be coarse; combine with Agent SDK permission callback as primary gate.
- **Convex per-agent project limits / quota** — verify management-API quotas before scale; fine for MVP.
- **Secret handling** — Convex creds + Anthropic key injected per run must never be logged; redaction enforced in `capture`.
