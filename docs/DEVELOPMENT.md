# Development Guide

## Prerequisites

- Node.js 20+
- Docker (for local Postgres)
- `gh` CLI (optional, for GitHub workflows)

## Setup

```bash
# Clone
git clone https://github.com/kgheacock/job-tracker
cd job-tracker

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install

# Copy env files
cp server/.env.example server/.env
# Edit server/.env with your values
```

## Running Locally

```bash
# Start Postgres
docker-compose up -d

# Run migrations
cd server && npm run migrate

# Start API (port 3001)
npm run dev

# In another terminal — start React (port 5173)
cd ../client && npm run dev
```

## Environment Variables

See `server/.env.example`. Required:

| Variable       | Description                          |
|----------------|--------------------------------------|
| DATABASE_URL   | Postgres connection string           |
| JWT_SECRET     | Secret for signing access tokens     |
| JWT_REFRESH_SECRET | Secret for signing refresh tokens |

Optional:

| Variable        | Description                     |
|-----------------|---------------------------------|
| CLAUDE_API_KEY  | Enables AI cover letter feature |
| PORT            | API port (default 3001)         |

## Migrations

Migrations live in `server/db/migrations/` as numbered SQL files:

```
001_create_users.sql
002_create_jobs.sql
003_create_status_events.sql
...
```

Run with:
```bash
npm run migrate       # run pending migrations
npm run migrate:undo  # revert last migration
```

## Build Phases

Work through these in order. Don't skip ahead.

- [ ] **Phase 1** — DB schema + migrations, seed data, raw `psql` verification
- [ ] **Phase 2** — Express server, CRUD routes for jobs (no auth yet), tested with curl/Postman
- [ ] **Phase 3** — Auth (register, login, JWT middleware), all routes protected
- [ ] **Phase 4** — React frontend (list, detail, forms)
- [ ] **Phase 5** — AI cover letter endpoint
- [ ] **Phase 6** — Deploy to Railway

## Code Style

- ESM throughout (`"type": "module"` in package.json)
- Async/await, no callbacks
- Express error handling via a central `errorHandler` middleware — no try/catch in every route
- DB queries go in service files, not route handlers
