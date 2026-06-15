# Helm — Market Brief (2026-06-15)

> Decision-oriented market research (distinct from the competitive landscape in `2026-06-15-competitive-landscape.md`).

## 1. Sizing — sell into the governance slice, not the broad agent market

| Segment | 2025 | 2026 | CAGR | Source |
|---|---|---|---|---|
| Broad AI agents market (TAM) | $7.6–7.9B | $9–11.6B | 40–50% | Precedence / Fortune BI / Grand View |
| **AI governance platforms (Helm's SAM)** | ~$308M | **~$492M** | **45%** → $5.8B by 2029 | Gartner (Feb 2026); MarketsandMarkets |

Gartner: $492M in 2026 → $1B+ by 2030. Helm's realistic **SOM ~$50–175M ARR by 2028** at 1–3% share (inference, not published).

Deployment ramp: Gartner — 40% of enterprise apps embed agents by end-2026 (from <5%). Enterprises run **~12 agents avg today → 20 by 2027** (Belitsoft). Deloitte: 23% use agentic AI now, **74% plan to within 2 years**; only **21% have a mature governance model**.

## 2. Demand signals (the pain is real and acute)

- **Shadow AI:** 82% of enterprises found an agent/workflow IT didn't know about (last 12mo). 269 shadow AI tools per 1,000 employees (Reco). Only 21% have mature agent governance (Deloitte).
- **Token blowouts (Helm's hard-cap pillar):** Uber burned its *entire 2026 AI budget by April* after rolling Claude Code to ~5,000 engineers. A healthcare firm: 1T tokens / $6M unplanned in 6 months. A 4-agent loop: $47K in 11 days. 85% miss AI cost forecasts by >10%.
- **FinOps:** 98% now actively manage AI spend (up from 63% in 2025) — a budget-holder with hard opinions now exists.
- **Security blocking adoption:** 74% see agents as a new attack vector; 97% of AI breaches lacked access controls. Gartner: >40% of agentic projects may be cancelled by 2027 (cost/governance/value).

## 3. Buyer & budget

Champion: **platform engineer / DX lead** already running ungoverned agents, wanting to legitimize it. Budget holder: **platform engineering / IT** ("internal developer platform" / "AI infra" line). Mandatory gates: **CISO/InfoSec** (audit, tool scoping, residency) and increasingly **FinOps** (token caps). Procurement trigger: a cost-blowout incident, a failed security audit, or a new agent-approval policy. Comparable deals: **$50K–$300K ARR/org**. Helm displaces DIY = LangSmith + a PaaS + a separate gateway.

## 4. Pricing benchmarks

| Product | Model | Notable |
|---|---|---|
| LangSmith / Deployment | per-seat + usage | $39/seat/mo + $2.50/1K traces over 10K |
| AWS AgentCore | pure usage/compute | $0.0895/vCPU-hr + $0.00945/GB-hr |
| Portkey | freemium + usage | Free 10K logs; Prod $49/mo +$9/100K req; Ent ~$2–5K/mo |
| AgentOps | freemium | Free 5K events; Pro $40/mo |
| Northflank | resource-based | $0.01667/vCPU-hr |
| Modal | per-ms execution | scale-to-zero |
| LiteLLM | open core | free OSS; enterprise custom |

**Recommended: Model A — per-agent + platform fee.** ~$500–2,000/mo platform (governance + IT control panel) + **~$25–75/active agent/mo**. Aligns price to the unit IT cares about (each deployed agent), trivial budget attribution, scales with the fleet, avoids per-token billing complexity in the governance layer. (B: platform fee + token passthrough w/ small markup. C: per-seat — weak, doesn't capture governance value.)

## 5. Risks / headwinds

- **Hyperscaler bundling** — AWS AgentCore (GA Oct 2025, OpenAI on Bedrock Apr 2026), Azure AI Foundry, Vertex Agent Builder. They price hosting as a loss leader; Helm can't win on raw hosting cost.
- **OSS gateway commoditization** — LiteLLM/Bifrost/Kong give budget caps + routing free. Helm's moat must sit *above* the gateway: per-agent DB + IT approval workflow + unified deploy.
- **"Trivial to copy"** — per-agent DB is a thin feature any PaaS (Northflank/Railway/Render) could add in a sprint; LangSmith now also hosts. Durable moat = opinionated DX + governance control plane as a first-class product, and framework-agnosticism.
- **Timing** — Gartner warns >40% of agentic projects may be cancelled by 2027; the pure control-plane slice is still nascent (~$492M).
- **Regulation** — EU AI Act / US state laws are a tailwind but may push enterprises toward their hyperscaler's compliance tooling.

_Full source URLs in session transcript / research agent output._
