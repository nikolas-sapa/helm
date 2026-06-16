# Helm — Go-to-Market & Marketing Plan (2026-06-16)

> Builds on: `2026-06-15-market-brief.md` (sizing, demand, pricing) and `2026-06-15-competitive-landscape.md` (competitors, open wedge). Do not re-read those for context — everything that matters is synthesized here.

---

## 1. POSITIONING

### One-sentence positioning statement

**Helm is the deployment platform for employee-authored internal agents — with the IT governance layer that makes them safe to ship.**

### Category to own

"Internal Agent Platform" (not "AI gateway", not "agent hosting"). This is a new category Helm must name and own before AWS/Vercel colonize the label. The frame: internal agent deployment as an IT-governed discipline, not a skunkworks experiment.

### Before / After

| Before Helm | After Helm |
|---|---|
| Agents live in Slack bots, cron jobs, and personal laptops — IT has no idea they exist | Every agent is registered, scoped, observed, and capped before it touches production data |
| "Who approved this tool calling our CRM?" — no answer | Per-agent tool + domain allowlist, enforced at the infra layer, auditable |
| Finance gets a $47K LLM bill with no line-item — someone's job is at risk | Per-agent monthly token cap with a hard kill switch — FinOps closes the quarter without a surprise |
| `helm deploy` errors out because nobody wired state storage | Convex DB auto-provisioned on deploy — zero config, data gravity stays inside Helm |

### Core narrative (tie to the pain that's already in the news)

Uber burned its entire 2026 AI budget by April. A healthcare firm hit 1T tokens — $6M unplanned — in six months. A 4-agent loop cost $47K in 11 days. These weren't bad actors; they were engineers doing their jobs.

The problem isn't the agents. The problem is that the platform layer — deploy, govern, observe, cap spend — was left to each team to duct-tape together. LangSmith gives you traces. A PaaS gives you hosting. A gateway gives you a budget alarm. Nobody gives you all four, wired together, in one `helm deploy`.

That's what Helm is. **The deployment platform where employee-authored agents go to grow up.**

---

## 2. ICP & MESSAGING

### ICP 1 — Platform Engineer / DX Lead (Champion)

**Profile:** 3–8 yrs experience, runs the internal developer platform (IDP) or AI infra initiative, already has 3–12 ungoverned agents running in Slack/cron/personal scripts, responsible for "making AI safe for the org" but has no mandate to build bespoke tooling.

**Their pain:** They're the person who gets paged when an agent misbehaves, and they're the person who has to tell finance why the LLM bill tripled. They want to legitimize what's already running without rebuilding from scratch.

**Message to them:**
> "You're already responsible for those agents. `helm deploy` gives you the control plane you needed six months ago — without rewriting a line of agent code."

**What resonates:** one-command deploy (no new infra to learn), framework-agnostic (they didn't write everything in LangChain), IT dashboard they can hand to the CISO, per-agent DB so agents aren't sharing state through workarounds.

### ICP 2 — IT/Security Lead + FinOps (Economic Buyer / Gate)

**Profile:** CISO or VP IT who has received at least one "we found this agent running on someone's laptop" incident. FinOps partner who is now actively managing AI spend (98% of enterprises are, up from 63% last year).

**Their pain:** Agents are a new attack surface (97% of AI breaches lacked access controls). They can't audit what they can't see. They can't budget what they can't cap. They're blocking agent adoption until someone puts a governance wrapper around it — which is exactly why deals stall.

**Message to them:**
> "Helm is the audit trail and kill switch you need to say yes. Every agent has an approved tool list, an approved domain list, and a monthly token budget that hard-stops at zero. No agent goes rogue, no invoice surprises."

**What resonates:** hard caps (not alerts — actual 429 kill switch), tool/domain allowlisting enforced at infra not code, run history and audit log in the dashboard, single pane of glass for all internal agents across teams.

### 3 Proof Points

1. **"From zero to governed agent in under 5 minutes"** — `helm init`, `helm deploy`, dashboard live. No infra provisioned manually. (Demo video is the proof.)
2. **"Your agents can't exceed their budget — the platform kills the request, not a Slack alert"** — The hard cap is enforced in the runtime gateway before the LLM call goes out. Portkey and LiteLLM can do this at the gateway but can't deploy; everyone who can deploy doesn't cap.
3. **"Auto-provisioned Convex DB per agent — no state setup, no shared tables, real data isolation"** — Nobody else does this on deploy. Agents are stateful services, not stateless scripts.

### Objection Handling

| Objection | Response |
|---|---|
| "We already use LangSmith" | LangSmith traces and hosts. It doesn't hard-cap spend, scope tools per agent, or provision state. Helm is the governance layer; LangSmith is the observability layer — they can coexist or Helm replaces the parts you're not using. |
| "AWS Bedrock AgentCore does governance" | AgentCore requires Cedar policy expertise and deep AWS infra commitment. No bundled DB. Not built for employee-authored agents — built for AWS-native workflows. If your devs are already writing TypeScript agents, Helm deploys them as-is. |
| "We can build this ourselves" | You're describing the internal platform you've been meaning to build for 6 months. Helm is that platform shipped today. The CISO isn't waiting. |
| "What about multi-tenant / untrusted agents?" | Helm is explicitly single-trust today (admin deploys = operator). Multi-tenant isolation (containerized sandboxing) is tracked and on the roadmap. The right use now is IT-governed internal agents from your own engineers. |
| "Our agents aren't in TypeScript" | Helm is framework-agnostic. The `defineAgent()` contract is a thin wrapper; the governance layer works on any agent that calls `ctx.complete` and `ctx.fetch`. |

---

## 3. PRICING GO-TO-MARKET

### Launch Pricing

**Model: Per-agent + platform fee** (recommended per market brief)

| Tier | Price | Includes |
|---|---|---|
| **Free / Design Partner** | $0 | Up to 3 agents, 1 admin seat, community support, Helm branding on dashboard |
| **Starter** | $299/mo | Up to 10 agents, 3 admin seats, IT control plane, run history 30 days |
| **Growth** | $999/mo | Up to 30 agents, 10 seats, run history 90 days, SSO, priority support |
| **Enterprise** | Custom (~$3–15K/mo) | Unlimited agents, SOC 2 docs, SLA, SAML/SSO, custom data residency, onboarding |

Per-agent overage: **$35/active agent/mo** beyond the tier limit.

**Rationale:** Platform fee anchors the relationship to IT/security (they approve it once). Per-agent fee scales naturally with fleet growth and gives FinOps a predictable line item. Avoids per-token pricing complexity in the governance layer (that lives on the LLM provider side). Competitive against "DIY stack" which runs $2–5K/mo in LangSmith + PaaS + gateway before you count engineering time.

### Free Tier / Design Partner Offer

- **Free tier:** 3 agents, functional IT control plane. Purpose: get the champion (platform engineer) to deploy without a PO. They show it to IT → IT approves → upsell to Starter.
- **Design partner offer (first 10 companies):** 6 months free Growth tier, weekly call with founding team, logo on website, co-authored case study. In exchange: monthly feedback sessions, permission to reference their governance requirements in product decisions. Target: companies with 50–500 engineers, at least one agent incident in the last 6 months, no formal agent governance today.

---

## 4. CHANNELS & TACTICS

Ranked by expected ROI for a pre-revenue product with a technical audience.

### 1. Developer community (organic, HN + X) — highest leverage

The champion (platform engineer) lives on HN and X. This is where the "shadow AI" and "burned our AI budget" narratives are already running. Helm's job is to show up in those conversations with a product, not an ad.

**First moves:**
- Write and submit the HN Launch post (see Section 5). Target front page.
- Post the "Uber burned its AI budget" angle on X with a `helm deploy` demo GIF. No product pitch — the story sells itself.
- Build in public: weekly X thread on what shipped, what broke, what the architecture decision was. Audience: platform engineers who relate to the exact tradeoffs.

### 2. Docs-as-marketing — second highest leverage

Platform engineers evaluate tools by reading the docs, not the landing page. If the docs are thin, the product is dead.

**First moves:**
- Ship `docs.helm.sh` on launch day. Must include: quickstart (<5 min), architecture overview, IT admin guide (the CISO deck in docs form), comparison page (Helm vs LangSmith, Helm vs AgentCore, Helm vs "DIY stack").
- Comparison pages are high-intent SEO with fast time-to-rank. "Helm vs LangSmith", "Helm vs AWS AgentCore", "internal agent governance platform" as target keywords.

### 3. LinkedIn (IT/security + FinOps angle) — best reach into the economic buyer

The economic buyer (CISO, VP IT, FinOps lead) does not read HN. They read LinkedIn. The content is different: risk framing, compliance language, ROI math.

**First moves:**
- Post the "$47K in 11 days" story (with permission or as an anonymized case study) with the frame: "This is why every internal agent needs a hard budget cap, not an alert."
- Target: CISOs and IT VPs at 200–2,000 employee companies. Engage with their posts on shadow AI and AI governance. Do not run ads yet — organic credibility first.
- Monthly "State of Internal Agent Governance" short-form post (1 data point + 1 implication + 1 CTA to docs).

### 4. Product Hunt — awareness spike on launch day

Good for: top-of-funnel signups, indie dev community, press coverage. Bad for: landing enterprise deals.

**First moves:**
- Coordinate with 10–15 authentic supporters (design partners, friends in DevTools) for upvotes and comments on launch day.
- Ship Product Hunt page the same week as HN launch. Stagger by 1–2 days to capture momentum from both.

### 5. Open-source free tier + GitHub presence

If any piece of Helm can be open-sourced (the core policy engine, the CLI), a GitHub repo with stars is a trust signal that converts enterprise buyers. The OSS path also creates a community that reports bugs and edge cases before paying customers hit them.

**First move:** Evaluate which packages can be open-sourced without giving away the governance control plane (the moat). Candidate: `@helm/core` (policy engine logic) or `@helm/agent` (the agent SDK). Keep `@helm/control-plane` (dashboard + Convex backend) closed. Ship the repo at launch.

### 6. Design partner outreach (direct, not inbound)

For the first $50K ARR, direct outreach to platform engineers in your network is faster than any inbound channel.

**First move:** Identify 20 platform engineers / DX leads at 100–500 person companies where you have a warm connection (or a second-degree intro). DM them the story, offer the design partner deal. Close 3–5 before the public launch.

---

## 5. LAUNCH SEQUENCE — 0 to 90 Days

### Pre-launch: Days 1–30

**Week 1 (now):**
- Close the first design partner conversation (warm outreach, offer 6 months free)
- Register `helm.sh` or `usehelm.dev` if not already done; stand up landing page with waitlist
- Write the HN Launch post draft (see below)

**Week 2:**
- Ship `docs.helm.sh` — quickstart, architecture, IT admin guide
- Write first X build-in-public thread: "We're building Helm — Vercel for internal agents. Here's the problem we're solving."
- Contact 5 more design partner candidates

**Week 3:**
- Onboard design partner #1. Run their first agent deploy end-to-end.
- Write the "before/after" landing page copy (use the table from Section 1)
- Record the 2-minute demo video: `helm init` → `helm deploy` → dashboard live → policy set → budget capped

**Week 4:**
- Ship comparison pages: Helm vs LangSmith, Helm vs AgentCore, Helm vs "build it yourself"
- Post the first LinkedIn piece: the Uber budget burn story + Helm's answer
- Brief 3–5 DevTools newsletters (TLDR, Bytes, Console) for launch week coverage

### Launch week: Days 31–37

**Monday:** Send email to waitlist ("Helm is live")
**Tuesday:** HN Show HN post. All hands on comments — respond to every one, especially the skeptics.
**Wednesday:** Product Hunt launch
**Thursday:** X thread: "48 hours since launch — what we heard, what surprised us, what's next"
**Friday:** DM anyone who commented on HN/PH with a genuine question and hasn't signed up. Offer a 20-minute onboarding call.

**Milestone target:** 200 waitlist conversions to free accounts, 3 design partners in active use, 1 press mention (DevTools newsletter or equivalent).

### Post-launch: Days 38–90

**Days 38–60:**
- Weekly build-in-public X thread (shipped last week, learning, what's next)
- Close design partner #2 and #3 on paid Starter tier ($299/mo)
- Ship: SSO, 30-day run history, first version of the audit log export (these are the CISO requirements that unlock the first paid deals)
- Publish first case study: "[Company] deployed 8 internal agents in a day without a security review blocker" (with design partner permission)

**Days 61–90:**
- First enterprise outbound: identify 10 companies that had a public AI cost incident or shadow AI story. Cold email the VP IT or platform eng lead with the case study.
- Write the "Internal Agent Governance" long-form post (2,000 words, SEO target: "internal AI agent governance"). This is the content that compounds.
- Target: first inbound enterprise demo request from organic search or LinkedIn.
- Host first "Internal Agent Platform" webinar: 30 min, invite design partners to share their use case, 15 min Helm demo. Record and post.

**90-day milestones:**
- 500 registered free accounts
- 5 paid accounts ($1,500–5,000 MRR)
- 3 design partner case studies in progress
- 1 enterprise pipeline deal (not closed, in discovery)
- Comparison pages ranking on page 2 for target keywords

---

## 6. CONTENT CALENDAR — First 8–10 Pieces

| # | Title / Angle | Format | Channel | When |
|---|---|---|---|---|
| 1 | **"Uber burned its 2026 AI budget by April. Here's the architecture decision that prevents it."** | X thread (8 tweets) + blog | X + blog | Pre-launch week 2 |
| 2 | **"We built Helm — Vercel for internal agents. Here's why it doesn't exist yet."** | HN Show HN / blog | HN + blog | Launch day |
| 3 | **"5-minute walkthrough: deploy a governed internal agent with a hard budget cap"** | 2-min Loom demo | X + docs | Launch week |
| 4 | **"Helm vs LangSmith: what's the difference?"** | Comparison page (SEO) | Docs site | Pre-launch week 3 |
| 5 | **"Helm vs AWS Bedrock AgentCore: same problem, different buyer"** | Comparison page (SEO) | Docs site | Pre-launch week 3 |
| 6 | **"How we auto-provision a Convex database per agent on deploy"** | Technical blog / X thread | X + blog | Post-launch week 5 |
| 7 | **"The CISO said no to agents. Here's what changed their mind."** (design partner story) | Case study | LinkedIn + blog | Post-launch day 45 |
| 8 | **"Internal Agent Governance: the complete guide"** | Long-form SEO post (2K words) | Blog | Post-launch day 60 |
| 9 | **"Shadow AI: 82% of enterprises found an agent IT didn't know about. What happens next?"** | LinkedIn article | LinkedIn | Post-launch day 50 |
| 10 | **"What we learned from our first 10 design partners"** | X thread + blog | X + blog | Day 75 |

---

## 7. METRICS — KPIs for First 90 Days

| KPI | Target (90 days) | Notes |
|---|---|---|
| Registered free accounts | 500 | Leading indicator of product-market fit signal. Track weekly cohort activation (do they deploy an agent?) |
| Agents deployed (total across all accounts) | 1,000 | The unit that matters — proves product actually does its job |
| Paid accounts (Starter+) | 5–8 | $1,500–$2,400 MRR; proof that IT budget holders say yes |
| Design partner NPS / qualitative signal | 3 champions willing to be a public reference | Unlocks case studies and enterprise outbound |
| HN launch score / organic reach | Top 10 on launch day | Vanity but useful for press and fundraising narrative |
| Docs / comparison page organic traffic | 500 unique visitors/mo by day 90 | SEO compounds slowly; 500 is realistic in 60 days post-publish |

Do not track: social followers, impressions, MQLs. Track: agents deployed, paid accounts, design partner depth (are they actually using it weekly?).

---

## 8. FIRST 5 ACTIONS — DO MONDAY MORNING

1. **Close one design partner conversation before the end of the week.** Send the offer (6 months free Growth tier + weekly call) to the warmest platform engineering contact you have. Don't wait for the product to be "more ready." A design partner onboards now and shapes what "more ready" means.

2. **Write the HN Launch post.** Target: 400 words, first-person, specific about the problem (quote the Uber story), specific about the solution (mention `helm deploy` + the IT dashboard), honest about what's missing (sandbox execution, multi-tenant isolation — don't hide it). HN readers reward honesty. Draft it, sit on it for 48 hours, revise once.

3. **Register the domain and stand up the landing page.** One page: the positioning statement, the before/after table, the demo video embed (once recorded), the waitlist form. No pricing yet. Ship it today, iterate after launch.

4. **Record the 2-minute demo.** `helm init` → `helm deploy` → dashboard → set a tool policy → set a $50/mo budget cap → show the run log. No narration needed if the terminal output is readable. This video is the most efficient sales asset you will produce in the next 90 days.

5. **Write the first comparison page: Helm vs "build it yourself."** This is the real competitive threat — the platform engineer who says "I'll just wire LangSmith + Render + Portkey." The page should show the total cost (engineering time + monthly bills + the gap in governance) and make the build-vs-buy decision obvious. This page will rank and it will convert.

---

*Research basis: market-brief 2026-06-15 (sizing, demand signals, pricing benchmarks) + competitive-landscape 2026-06-15 (pillar gap analysis). Numbers cited are from those documents.*
