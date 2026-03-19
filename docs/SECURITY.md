# Security — OWASP Top 10 (2021)

This document addresses each item in the OWASP Top 10 as it applies to Job Tracker. Where a risk is not applicable, the reason is stated explicitly.

---

## A01 — Broken Access Control

**Risk:** Users accessing or modifying other users' data.

**How we address it:**

Every job, note, contact, and status event is scoped to a `user_id`. Route handlers verify ownership before returning or mutating any resource:

```js
const job = await getJobById(id);
if (!job || job.user_id !== req.user.id) {
  return res.status(404).json({ error: { code: 'NOT_FOUND' } });
}
```

Returning 404 (not 403) on foreign resources avoids confirming that the resource exists. Auth middleware runs on all `/api/*` routes except `/api/auth`. There is no admin role or privilege escalation surface.

---

## A02 — Cryptographic Failures

**Risk:** Sensitive data exposed via weak encryption or in plaintext.

**How we address it:**

- Passwords hashed with **bcrypt** (cost factor 12). The hash is never returned by any API response.
- JWTs signed with HS256 using a strong random secret (`JWT_SECRET`, `JWT_REFRESH_SECRET`) stored in environment variables, never in code.
- All traffic served over **HTTPS** (enforced by Railway in production; HTTP redirects to HTTPS).
- No sensitive data stored in localStorage — tokens held in memory or httpOnly cookies if session approach is adopted.
- Database connection over TLS (`sslmode=require` on the Railway Postgres connection string).

---

## A03 — Injection

**Risk:** SQL injection, command injection, or other input-driven code execution.

**How we address it:**

All database queries use **parameterized queries** via `node-postgres` (`pg`). No string interpolation into SQL. Example:

```js
const { rows } = await pool.query(
  'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
  [jobId, userId]
);
```

No shell commands are executed. No `eval`. The AI endpoint passes user-supplied text to the Claude API as a string in a prompt — not executed anywhere. Resume text is not stored in the database.

---

## A04 — Insecure Design

**Risk:** Architecture-level flaws that cannot be patched later.

**How we address it:**

- Threat modeling done up front (this document).
- Status history is append-only — no silent data mutation.
- Auth is stateless with short-lived tokens — compromise radius is bounded by token TTL.
- AI feature is opt-in and isolated behind a single service — a compromised API key can't affect auth or data.
- Ownership checks are in the service layer, not just route middleware, so they're not bypassable by adding new routes.

---

## A05 — Security Misconfiguration

**Risk:** Default credentials, open cloud storage, verbose error messages in production, unnecessary features enabled.

**How we address it:**

- No default credentials anywhere. Secrets are required env vars; the app fails to start without them.
- Production error responses return a generic message and error code only — no stack traces, no internal paths. Stack traces go to the logger (stdout), not the response.
- `NODE_ENV=production` disables Morgan's verbose dev format and pino's pretty-printer.
- CORS is configured explicitly: only the frontend origin is allowed, not `*`.
- No admin UI, no debug routes, no `/status` endpoint that leaks internals.
- Helmet.js sets security-relevant HTTP headers (CSP, X-Frame-Options, etc.).

---

## A06 — Vulnerable and Outdated Components

**Risk:** Dependencies with known CVEs.

**How we address it:**

- `npm audit` run before each phase merge. Failing audit blocks the PR.
- GitHub Dependabot alerts enabled on the repo.
- Direct dependency list is intentionally small — fewer deps, smaller attack surface.
- No dependencies with known high/critical CVEs will be merged without documented mitigation or workaround.

---

## A07 — Identification and Authentication Failures

**Risk:** Weak passwords, credential stuffing, broken session management, token leakage.

**How we address it:**

- Password minimum: 8 characters (enforced server-side, not just client-side).
- bcrypt cost factor 12 — brute-force resistant.
- Access tokens are **short-lived** (15 minutes). Refresh tokens are **long-lived** (7 days) and rotated on use — a stolen refresh token is single-use.
- Refresh tokens are stored hashed in the DB; the plaintext is only ever in the response at issuance.
- Rate limiting on `/api/auth/login` and `/api/auth/register` via `express-rate-limit` — prevents brute-force and credential stuffing.
- No "security questions." No password hints stored.

**Not implemented (scope decision):**

- MFA — out of scope for a portfolio project but the auth service is structured to support it (a `mfa_secret` column can be added to `users`).
- Account lockout — rate limiting is the primary mitigation; lockout adds UX complexity for minimal additional gain in a single-user context.

---

## A08 — Software and Data Integrity Failures

**Risk:** Unsigned updates, insecure CI/CD pipelines, deserialization of untrusted data.

**How we address it:**

- No auto-update mechanisms or plugin systems. The app doesn't download or execute code at runtime.
- No object deserialization — all API input is JSON parsed by Express's built-in body parser, which does not instantiate classes.
- CI/CD (if added) would use GitHub Actions with pinned action versions and least-privilege tokens.
- No serialized objects passed between client and server — only plain JSON.

---

## A09 — Security Logging and Monitoring Failures

**Risk:** Attacks go undetected due to insufficient logging.

**How we address it:**

Covered in detail in [ARCHITECTURE.md — Observability](ARCHITECTURE.md#observability). Summary:

- Traces (not logs) are the primary signal. All auth events, API calls, and DB queries are captured as OTel spans.
- Every request carries a `correlation_id` that ties client errors, API calls, and DB queries into a single traceable unit.
- Client-side exceptions are reported to `POST /api/errors` and recorded as trace span events — not raw logs.
- No sensitive data (passwords, tokens, resume text, PII beyond user_id) appears in any span attribute.
- Rate limiting and deduplication on the error reporting endpoint prevent abuse and noise.

---

## A10 — Server-Side Request Forgery (SSRF)

**Risk:** Server making HTTP requests to attacker-controlled URLs, potentially accessing internal infrastructure.

**Assessment: Low risk, partially mitigated.**

The only server-side HTTP request this app makes is to the Claude API (`api.anthropic.com`). The URL is hardcoded — it is not derived from user input. There is no feature where a user supplies a URL that the server fetches (e.g., no link preview, no webhook, no import-from-URL).

The job posting URL field (`jobs.url`) is stored as a string and returned to the client — the server never fetches it. If a link preview feature were added in the future, SSRF mitigation (URL allowlist, blocking private IP ranges) would be required at that point.

---

## Summary

| OWASP Item | Status | Primary Control |
|------------|--------|-----------------|
| A01 Broken Access Control | ✅ Addressed | Ownership check on every resource query |
| A02 Cryptographic Failures | ✅ Addressed | bcrypt, HTTPS, env secrets, TLS DB conn |
| A03 Injection | ✅ Addressed | Parameterized queries throughout |
| A04 Insecure Design | ✅ Addressed | Threat modeled up front, append-only events |
| A05 Security Misconfiguration | ✅ Addressed | Helmet, explicit CORS, no stack traces in prod |
| A06 Vulnerable Components | ✅ Addressed | npm audit in CI, Dependabot |
| A07 Auth Failures | ✅ Addressed | bcrypt, short-lived JWTs, rate limiting |
| A08 Integrity Failures | ✅ Addressed | No dynamic code execution, no deserialization |
| A09 Logging Failures | ✅ Addressed | Structured logging, auth events, no secrets in logs |
| A10 SSRF | ⚠️ Low risk | No user-controlled server-side requests |
