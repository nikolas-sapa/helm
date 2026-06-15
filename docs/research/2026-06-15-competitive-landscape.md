# Helm — Competitive Landscape (2026-06-15)

**Helm's four pillars:** (i) one-command deploy/hosting · (ii) auto-provisioned per-agent DB · (iii) IT scoping of tools + outbound domains · (iv) per-agent token-spend governance with hard budget caps.

## Verdict: the combined wedge is genuinely open

No single product covers all four pillars. They split cleanly into two camps that don't overlap:

- **Hosting/deploy platforms** (LangSmith Deployment, Agentuity, Blaxel, Modal, Cloudflare Agents, Vercel AI Cloud) — cover deploy, none bundle a per-agent DB, none do IT tool/domain scoping, none do hard token caps. All target the *developer*, not the IT admin.
- **AI gateways** (Portkey, LiteLLM, Helicone) — have hard per-key budget caps (429 on overspend) but zero hosting, DB, or tool scoping.
- **Enterprise clouds** (AWS Bedrock AgentCore, Google Vertex Agent Builder, Microsoft 365 Agent Control Plane) — have policy/tool scoping (AgentCore Cedar policy GA Mar 2026; Vertex IAM) but require deep cloud lock-in, no bundled DB, and are plumbing, not a one-command developer product.

**Nearest single competitor:** AWS Bedrock AgentCore (covers i, iii, partial iv) — but deep AWS infra, Cedar-policy expertise, no bundled DB, not positioned for employee-authored agents.

**Nobody auto-provisions a database per agent on deploy.** (Convex has a per-agent deployment mode, but every platform makes you wire it manually.)

## Comparison (which pillars each covers)

| Product | Deploy | Per-agent DB | IT tool/domain scoping | Hard token caps |
|---|---|---|---|---|
| LangSmith Deployment | ✅ | ❌ | ⚠️ HITL only | ❌ |
| AWS Bedrock AgentCore | ✅ | ❌ | ✅ Cedar policy | ⚠️ visibility only |
| Cloudflare Agents | ✅ | ❌ | ❌ | ❌ |
| Vercel AI Gateway + Sandbox | ⚠️ | ❌ | ❌ | ❌ |
| Modal | ✅ | ❌ | ❌ | ⚠️ |
| E2B | ❌ sandbox only | ❌ | ❌ | ❌ |
| Agentuity | ✅ | ⚠️ as tools | ❌ | ❌ |
| Blaxel (YC S25) | ✅ | ❌ | ❌ | ❌ |
| Northflank | ✅ | ⚠️ manual | ⚠️ RBAC | ❌ |
| Google Vertex Agent Builder | ✅ | ❌ | ✅ IAM | ⚠️ |
| Portkey | ❌ gateway | ❌ | ❌ | ✅ |
| LiteLLM | ❌ gateway | ❌ | ❌ | ✅ |
| Relevance AI / Lindy | ❌ no-code | ❌ | ⚠️/❌ | ❌ |
| Microsoft 365 Agent Control Plane | ⚠️ | ❌ | ✅ DLP/IAM | ⚠️ |

## Top 3 differentiation angles

1. **IT/admin control plane is the moat.** Everyone targets the developer writing the agent. Helm targets the IT/security buyer who must govern it — scope tools, block domains, watch runs, cap spend. That buyer is absent from every competitor's narrative and opens a different procurement door.
2. **Bundled per-agent DB turns agents from stateless scripts into durable services.** No platform auto-provisions a DB on deploy; it removes state-setup friction and creates data-gravity lock-in.
3. **Hard budget caps as a risk control, not just billing visibility.** Gateways cap but don't host; hosts don't cap. Helm is the only place a finance/IT team can enforce "this agent spends ≤ $X/month" at the infra layer — the kill switch that makes internal agent deployment politically safe.

_Sources: LangChain, AWS, Cloudflare, Agentuity, Blaxel, Convex, Portkey/LiteLLM, Google Vertex, Microsoft Build 2026, Gartner/Voiceflow, Vercel — full URLs in session transcript._
