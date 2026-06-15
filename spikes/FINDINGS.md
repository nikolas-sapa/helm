# Step-0 Spike Findings (2026-06-15)

Verdict: **GO.** Both deferred unknowns resolved positively.

## 1. Codex runner — PASS

Interface for the runner to invoke a Codex-powered agent non-interactively:

```bash
echo "<prompt>" | codex exec --json --skip-git-repo-check -o last.txt
```

- `--json` emits JSONL events to stdout.
- Final agent message: the `item.completed` event with `item.type == "agent_message"`, also written to the `-o` file.
- **Token usage** comes from the `turn.completed` event:
  ```json
  {"type":"turn.completed","usage":{"input_tokens":15306,"cached_input_tokens":4992,"output_tokens":7,"reasoning_output_tokens":0}}
  ```
- Map to `@helm/core` `Usage`: `tokensIn = input_tokens`, `tokensOut = output_tokens + reasoning_output_tokens`, `model = <pinned via -m>`.
- Pin the model with `-m <model>` so cost/metering is deterministic.

### Locked signature
`runner.run(agent, input, policy)` →
1. build prompt from agent + input
2. `codex exec --json -m <model> -o last.txt` (cwd = sandbox bundle dir)
3. parse JSONL: collect `agent_message` text + `turn.completed.usage`
4. `assembleResult({ output, usage, toolCalls, durationMs, error })` (from `@helm/runtime`)

## 2. Convex provisioning — PASS (per-agent projects ARE scriptable)

Non-interactive per-agent project creation:

```bash
# in a fresh dir containing a minimal package.json (with `convex` dep to also push)
npx convex dev --once --configure new --project <agent-slug> --dev-deployment cloud
```

- Creates the project + a cloud dev deployment with **no prompts** (single-team accounts auto-resolve the team; multi-team needs `--team <slug>`).
- Writes `.env.local` with: `CONVEX_DEPLOYMENT`, `CONVEX_URL`, `CONVEX_SITE_URL`.
- Benign trailing error if `convex` isn't in `package.json` deps ("In order to push, add convex") — provisioning still succeeds; only the function *push* step needs the dep.

### Provisioner wiring
`ProvisionApi.createProject(agentId)`:
1. mkdtemp, write `package.json` with `convex` dep
2. run the `convex dev --once --configure new --project helm-<agentId> --dev-deployment cloud`
3. read `.env.local` → return `{ projectId: <slug>, url: CONVEX_URL, adminKey: <deploy key> }`

**Open detail for runner build:** `.env.local` does NOT include an admin/deploy key. For the agent (in a sandbox) to read/write its DB, generate a deploy key via the dashboard or `convex deployment` and inject as `CONVEX_DEPLOY_KEY`. Resolve when wiring `runner` ↔ agent Convex client.

The shared+namespaced fallback in `provisioner.ts` is retained as backup (e.g. project-quota exhaustion) but is NOT on the happy path.

## Artifacts created
- Real Convex project **`helm-spike`** in account team `84yk8btb9f` (deployment `tacit-gnat-495`). Throwaway — safe to delete from the dashboard.
