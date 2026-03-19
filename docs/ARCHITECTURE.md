# Architecture

## Overview

Job Tracker is a standard client-server application with a clear separation between the React SPA and the Express API. The database is the source of truth; the API layer owns all business logic; the client is a thin presentation layer.

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                  React SPA (Vite)                   │
│         routes / components / api client            │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (REST + JSON)
┌──────────────────────▼──────────────────────────────┐
│                  Express API                        │
│    auth middleware → route handlers → services      │
│                                                     │
│   /api/auth        /api/jobs        /api/ai         │
└──────────┬───────────────────────────────┬──────────┘
           │                               │
┌──────────▼──────────┐       ┌────────────▼──────────┐
│     PostgreSQL      │       │     Claude API         │
│   (source of truth) │       │  (on-demand, optional) │
└─────────────────────┘       └───────────────────────┘
```

## Core Principles

**1. Server owns logic.** No business logic in the client. The API validates, enforces rules, and is the single point of access to the DB.

**2. Migrations over manual schema.** Every schema change is a numbered migration file. The DB state is always reproducible from scratch.

**3. Status history is append-only.** When a job moves from "Applied" to "Phone Screen," a row is inserted into `status_events` — never updated. This gives a full audit trail and enables timeline views.

**4. AI is a feature, not a dependency.** The AI layer is a single optional service. If `CLAUDE_API_KEY` is not set, that route returns 501. The app is fully functional without it.

**5. Auth is stateless.** JWTs issued at login, verified by middleware on protected routes. No sessions, no cookies. Short-lived access tokens + refresh token rotation.

## Logging

Logging is treated as an operational requirement, not an afterthought.

### What Gets Logged

| Event                        | Level | Notes                                           |
|------------------------------|-------|-------------------------------------------------|
| Incoming requests            | info  | method, path, status, latency — via morgan      |
| Auth failures (401/403)      | warn  | includes reason (expired, invalid, missing)     |
| Validation errors (400)      | info  | expected, not alarming                          |
| Resource not found (404)     | info  | expected                                        |
| Unhandled errors (500)       | error | full stack trace                                |
| DB query errors              | error | query context, no user data in message          |
| AI API calls                 | info  | jobId, latency, token count — no resume text    |
| Login attempts               | info  | email (success or failure), no passwords ever   |

### What Never Gets Logged

- Passwords or password hashes
- JWT tokens
- Full request/response bodies on auth routes
- Resume text sent to the AI endpoint
- Any PII beyond email on login events

### Implementation

- **`morgan`** for HTTP request logging (combined format in prod, dev format locally)
- **`pino`** for structured application logging — outputs JSON in production, pretty-printed in development
- Log level controlled by `LOG_LEVEL` env var (default: `info` in prod, `debug` in dev)
- All logs go to stdout — the deployment platform (Railway) captures and stores them
- No log files on disk; no log rotation complexity

### Example log shape (prod)
```json
{
  "level": "info",
  "time": "2026-03-18T17:00:00.000Z",
  "msg": "auth.login.success",
  "email": "user@example.com",
  "userId": "uuid-here",
  "latencyMs": 42
}
```

## Security

See [SECURITY.md](SECURITY.md) for the full OWASP Top 10 analysis.

Summary: the primary surface area is auth (JWT handling, password storage) and access control (ensuring users can only access their own data). Injection is mitigated by parameterized queries throughout. The app has no file uploads, no XML parsing, and no third-party component complexity beyond its direct dependencies.

## Build Phases

### Phase 1 — Core CRUD (no auth)
Get the data model right. Build the jobs table, status_events, and basic CRUD routes. Seed with test data. Validate the schema makes sense before writing any UI.

### Phase 2 — Auth
Add users table. Protect all routes. Implement login/register with bcrypt + JWT.

### Phase 3 — React Frontend
Build the UI against the running API. Job list, detail view, add/edit form, status history timeline.

### Phase 4 — AI Layer
Single POST endpoint: accepts a job ID + resume text, returns a cover letter. On-demand only.

### Phase 5 — Deployment
Railway (Postgres + Node service). Environment variables for secrets. Production build pipeline.
