# Helm — Marketing Channel Research (2026-06-16)

> Tactical "how to get in front of buyers" brief. Pairs with `2026-06-16-marketing-plan.md` (the GTM plan).

**TL;DR:** Helm sits at developer-infra (PLG via engineers) ∩ enterprise governance (top-down via CISO/FinOps). Win the developer narrative first ("ship agents in one command"), then let the Uber budget-burn story pull IT/FinOps in. Launch on HN, build in public on X, make docs the SEO foundation, run a tight design-partner program before GA.

## Channel priority matrix

| Rank | Channel | Audience | Time-to-ROI |
|---|---|---|---|
| 1 | Hacker News (Show/Launch HN) | Devs / platform eng | Days |
| 2 | Technical SEO / docs-as-marketing | Devs (bottom-of-funnel search) | Months |
| 3 | Build-in-public (X/Twitter) | Devs, early adopters | Weeks |
| 4 | Latent Space / AI Engineer community | AI engineers | Weeks |
| 5 | Reddit (r/devops, r/LocalLLaMA, r/ExperiencedDevs) | Platform eng, builders | Weeks |
| 6 | FinOps Foundation / FinOps X | FinOps leads | Months |
| 7 | KubeCon / Platform Engineering Day | Platform eng | Months |
| 8 | Product Hunt | Devs, general tech | Days |
| 9 | LinkedIn (paid+organic, role-targeted) | CISO, FinOps, CIO | Months |
| 10 | YouTube tutorials | Devs (long-tail) | Months |

## Launch playbook (sequenced)
- **T-8w design partners:** 5–10 platform-eng teams at 100–1,000-eng companies, free access for weekly calls + quotes. (Modal, Resend did this.) Most important pre-launch asset = real numbers + testimonials.
- **T-4w content pre-load:** 3 cornerstones indexed before launch — governance essay, technical deep-dive (per-agent DB in <2s), comparison page (Helm vs roll-your-own).
- **T-1w:** waitlist landing + design-partner quotes + "request a slot" CTA (selectivity).
- **Launch day:** Show HN 9am ET (Tue–Thu) + Product Hunt + founder build-in-public X thread + waitlist email; founder answers every HN comment for 4h. Have 10–20 engineers ready for genuine feedback (not upvotes — HN punishes hype).
- **T+1w:** "what we learned from launch" retro post → second HN/Reddit cycle.

## Content hooks that convert
- **The Uber story:** "Uber burned its 2026 AI budget by April. Here's the governance layer that would've prevented it." Anchor every piece to this. (79% of companies had AI cost overruns; only 15% can calc AI ROI.)
- **Shadow AI as a *financial* risk** (not just security): >80% use unapproved AI; shadow AI adds ~$670K to breach costs. CISO/FinOps pitch.
- Formats: comparison/SEO pages, one-click agent **template library** (highest-converting free-tier hook — Vercel/Convex/Railway proof), kill-switch explainer video, observability showcase, weekly build-in-public logs.

## Dual-audience messaging (resolve the core tension)
Developer wants to ship; IT/FinOps wants control. Vercel solved this — devs love speed, IT loves auditability. Mirror it:
- **Developer:** "One command to deploy. Auto-provisioned database. No DevOps tickets." Lead with speed; governance is invisible.
- **CISO:** "Every agent scoped. Every run visible. Hard budget limits with a kill switch." Concrete mechanisms, not vague "governance."
- **FinOps:** "Token budgets per agent. Know each agent's cost before the invoice." Control, not just observability.
Frame: governance as the *enabler* of developer autonomy (Zenity-style), not the blocker.

## Communities & people
AI eng: Swyx / Alessio Fanelli (Latent Space, 170K newsletter), Simon Willison, AI Engineer World's Fair. Platform eng: Charity Majors, Luca Galante (Platform Eng community 15K, PlatformCon). FinOps: FinOps Foundation, Corey Quinn (cloud cost). Discords: LangChain, CrewAI/AutoGen, Dagster.

## Pitfalls (governance/infra products)
- Don't **lead with fear/compliance** — accuses the dev, signals weak product. Lead with enablement.
- Don't **sound like an audit/surveillance tool** to devs ("logged"/"visibility", not "monitor employee usage"). Save "audit trail" for the CISO page.
- Don't **skip the free tier** — bottom-up adoption needs it (3-agent free tier).
- Don't **position as observability** (LangSmith/Portkey/Arize) — Helm *prevents* (kill switch, scoping, caps), it doesn't just report.
- Don't **go enterprise-first** — get ~100 individual devs deploying before the first enterprise contract; organic internal adoption is the buying signal CISOs trust.

_Full source URLs in session transcript (HN/PH guides, daily.dev, FinOps X, KubeCon, Latent Space, Uber coverage, shadow-AI reports, etc.)._
