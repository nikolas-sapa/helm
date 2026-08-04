# Contributing to Helm

Helm is a TypeScript monorepo (npm workspaces). Thanks for taking a look.

## Repo layout

| Path | What's there |
|---|---|
| `packages/core` | pure logic — token cost, policy engine, bundle hashing |
| `packages/agent` | `defineAgent()` contract + domain-gated `fetch` |
| `packages/runtime` | Codex runner, Convex provisioner, run capture, key auth |
| `packages/cli` | `helm init / deploy / auth / whoami / set-url` |
| `apps/control-plane` | Convex schema + functions, Hono ingress + deploy API, dashboard |
| `docs/` | specs and plans |
| `spikes/` | exploratory findings, not production code |

## Dev setup

```bash
npm install               # installs all workspaces from the repo root
npm test                  # runs vitest across packages/*
```

To run the full stack locally (control plane + a deployed agent), see **Run the demo locally** in the [README](./README.md) — it walks through Convex setup, starting the control plane, and deploying a test agent.

To test a single package:

```bash
cd packages/core && npm test
```

## Before opening a PR

- Run `npm test` at the repo root and make sure it's green.
- Keep changes scoped — one concern per PR.
- If you're changing `@helm/core` or `@helm/runtime` behavior, add or update a test in that package.
- Don't commit `.env*`, generated Convex files, or anything under `spikes/`.

## Commit style

Short, imperative subject lines (`fix: ...`, `add: ...`, `refactor: ...`). No strict convention is enforced, but keep the first line under ~72 characters and explain *why* in the body if the change isn't obvious.

## PR expectations

- Describe what changed and why.
- Link any related issue.
- A maintainer will review before merge — expect questions on anything touching the trust model (`packages/runtime`, execution modes) or the control-plane admin gate.

## Questions

Open an issue, or see [SECURITY.md](./SECURITY.md) for vulnerability reports.
