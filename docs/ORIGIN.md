# Origin Story

This project was designed in a live conversation between Keith (the engineer) and Cleo (an AI assistant running via OpenClaw). The conversation happened on **March 18, 2026** over Slack.

Recording it here is intentional. It shows the thinking process, not just the output — how the problem was framed, what was rejected and why, and the reasoning behind each design decision.

---

## The Conversation

**Keith:** Recommend me a personal project to fill in gaps in my full stack picture.

**Cleo:** Based on your profile — strong React + Express, light on backend depth, no public portfolio — here's the gap analysis first, then the rec:

What's actually missing:
- Real database work (schema design, migrations, not just API calls)
- Auth (own it end-to-end, not just UI for it)
- Something deployed and linkable on a resume

**My recommendation: Build a job application tracker with an AI assist layer.**

It's meta (you're job hunting), but it checks every box:
- **Frontend:** React — your strength, shouldn't take long
- **Backend:** Node/Express + PostgreSQL — forces real DB design
- **Auth:** Google OAuth or email/password with JWTs — own this from scratch
- **AI feature:** Hook into OpenAI or Claude API to generate tailored cover letters
- **Deployment:** Ship it on Railway or Fly.io — now you have a live URL

Why this one specifically:
1. Solves a real problem you have right now — you'll actually build it
2. The AI feature is genuinely useful, not a demo gimmick
3. PostgreSQL forces you to think in schemas, relations, and migrations — that's the backend depth story you need
4. A live app > "built something internal at PayPal" on every interview conversation

Alternative: A lean SaaS dashboard that ingests webhook events (Stripe, GitHub, etc.) and displays analytics.

---

**Keith:** No constraints but I'm worried about AI cost on the first. On the second, what sort of analytics would be useful? I don't personally have a need for this so it's harder to dogfood.

**Cleo:** Both concerns are valid.

On AI cost: Easy fix — make the AI layer optional/lazy. Only call the API when the user explicitly clicks "Generate cover letter." Budget exposure is ~$0.02 per request with Claude Haiku. You could mock it in dev and only wire it up at the end.

On the SaaS dashboard: Your instinct is right — building something you don't use is a grind and the result shows. I'd drop that one.

**Revised take: Stick with the job tracker, simplify the AI part.** The tracker is better because you're literally using it right now (100% dogfoodable). The AI feature is a bonus, not the point.

---

**Keith:** Because I'm a senior engineer I need to show well thought-out design. Let's decompose the problem and build incrementally. Create a gh repo to start.

*→ Cleo created [github.com/kgheacock/job-tracker](https://github.com/kgheacock/job-tracker) and committed four design docs before any application code:*
- `ARCHITECTURE.md` — system diagram, core principles, 5-phase build plan
- `DATA_MODEL.md` — full schema with rationale (UUIDs, append-only status history, cascade deletes, denormalized `current_status`)
- `API.md` — all endpoints, request/response shapes, consistent error contract
- `DEVELOPMENT.md` — local setup, env vars, migration strategy, ordered build phases

---

**Keith:** Logging is not considered in ARCHITECTURE. Also add a security section that goes line by line in OWASP Top 10 and calls out how it will be addressed or why it isn't relevant.

*→ Cleo added a Logging section to ARCHITECTURE.md (morgan + pino, what to log/not log, structured JSON shape) and created SECURITY.md with a full OWASP Top 10 (2021) analysis including code snippets, honest scope decisions (MFA out of scope with rationale), and a summary table.*

---

**Keith:** Also, lean into the meta angle: record our conversation log in the git repo.

*→ This file.*

---

## Why This Matters

The conversation record demonstrates something that's hard to show in code alone: **engineering judgment in real time**.

- The SaaS dashboard idea was considered and rejected because it wasn't dogfoodable
- The AI feature was scoped down from "core feature" to "optional bolt-on" based on cost and complexity
- Design docs came before code by deliberate choice
- OWASP coverage was added not because someone ran a checklist, but because it was flagged as missing

That's the senior engineer signal — not just building things, but thinking about what to build and why, and being willing to revise.
