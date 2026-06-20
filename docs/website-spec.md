# Helm — landing page spec

## Verdict: build from scratch

Helm has no public marketing page. The only deployed Vercel project (`helm`) is the dashboard itself, and it 404s for unauthenticated visitors — that's an app, not a site, and should stay separate from whatever marketing page ships.

## Positioning

One-liner: **"Vercel for internal agents."**

Headline options (direct, no corporate filler — per brand voice):
1. "Your team writes agents. IT doesn't lose sleep over it."
2. "Deploy an internal agent in one command. Govern it in zero extra ones."
3. "Vercel for internal agents."  *(use as the eyebrow/subhead if a punchier headline wins above)*

Subhead options:
- "One command gets your agent hosting, a database, and a kill switch IT actually trusts."
- "Every internal agent — hosted, metered, and scoped — without anyone touching a Kubernetes cluster."

Audience: Segment C (developers/technical) for the builder, but the buyer is IT/eng-leadership — the page needs to read credibly to both in different sections (dev speed up top, governance proof further down).

## Section structure

1. **Hero** — headline + subhead + a single CLI command as the hero visual (`npx helm deploy`), not a screenshot. Eyebrow: "self-hosted control plane · keyless by default · per-agent DB included."
2. **The problem** — short, three-bullet section: agents get written, nobody hosts them safely, IT finds out after the fact. No invented stats — keep it to the structural problem, not fabricated numbers.
3. **How it works** — 4-step flow mirroring the actual architecture: write `defineAgent` → `helm deploy` → isolated execution + auto-provisioned Convex DB → IT dashboard shows scope/spend/kill-switch. This is the credibility section — show the real CLI contract, not a mockup.
4. **Governance proof points** — the moat. Tool/domain scoping, per-agent token-spend caps, hard kill switch, audit trail. This is what differentiates Helm from "just run it on a VM" — give it real visual weight, not a throwaway bullet list.
5. **Pricing** — $299 / $999 / Enterprise + overage, 3-agent free tier (already decided — pull verbatim from `08-Decisions/2026-06-16-helm-architecture.md`, don't invent new numbers).
6. **CTA** — "Deploy your first agent" → CLI install command, or a waitlist/contact form if the platform isn't open for self-serve yet (confirm which before shipping — don't imply self-serve if it isn't).

## Visual direction (design-dna applied)

- Dark mode default (`--bg-dark #0B0B0D`, `--surface-dark #1A1A1E`) — this is an infra/dev-tool product, dark-default fits the Vercel/Linear/Raycast reference better than Command Center's light Mono Ink treatment.
- Monochrome accent only (`#F3F2EE` / `#FFFFFF` hover) — emphasis via weight and underline, never a chromatic highlight, even though "governance/security" products often reach for red/amber alert colors. Don't.
- Sora for headings, Plus Jakarta Sans for body, Geist Mono for the CLI/code blocks — the CLI command in the hero and the architecture diagram labels are exactly where Geist Mono earns its place.
- Radius rhythm: 6px on the CLI command chip and badges, 12px on pricing/governance cards, 20px if there's any modal/waitlist sheet.
- Glassmorphism only on an elevated surface — e.g. a translucent panel behind the architecture diagram, never as the page background.

## Concrete components

- Hero: animated CLI command block (type-on effect, not a static screenshot)
- Architecture diagram: the 4-package flow (`@helm/core` → `@helm/agent` → `@helm/runtime` → `@helm/cli`) as a simple horizontal flow, monochrome, Geist Mono labels
- Live spend/metering mock: use `@number-flow/react` for an animated token-spend counter ticking down against a budget cap — this single component does more to sell "governance" than any amount of copy
- Pricing cards: 12px radius, glass surface on hover (translucency + blur), not gradient-filled
- Kill-switch visual: a single toggle/switch component, monochrome, with a clear "off = nothing runs" state — this is the trust signal, give it space

## Stack / deploy path

Next.js + Tailwind + Vercel — consistent with sibling marketing sites in this portfolio ecosystem (e.g. `trypadelup-website`). This is a real marketing funnel (has pricing, has a buyer persona distinct from the builder) so the lightweight static-HTML approach used for Command Center is the wrong call here — Helm's page needs analytics, possibly a waitlist form with backend, and room to grow (case studies, docs links) that a single static file doesn't support well.

## Explicit don'ts

- Don't use red/amber/orange for the security/governance messaging — tempting because "security = warning colors" is a common reflex, but it directly violates the no-chromatic-accent rule. Convey urgency/trust through copy and weight, not hue.
- Don't gradient-wash the hero — no blue/purple washes, ever, per design-dna bans.
- Don't fabricate metrics ("99.9% uptime", "trusted by X teams") — Helm has no customers yet; the proof points are architectural (isolated execution, real Codex+Convex verification), not social.
- Don't imply self-serve signup if the platform isn't actually open for it — check before the CTA copy is finalized.

## Pre-build checklist

- [ ] Confirm self-serve vs. waitlist CTA before writing final copy
- [ ] Pull pricing verbatim from the locked decision doc, don't restate from memory
- [ ] Build the metering counter component before the rest of the page — it's the highest-leverage piece
- [ ] Dark-mode contrast check on monochrome-on-dark text (`#F3F2EE` on `#0B0B0D`)
- [ ] Deploy to its own Vercel project (not the existing `helm` dashboard project) — keep marketing site and app separate
