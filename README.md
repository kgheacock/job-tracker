# Job Tracker

A full-stack job application tracker with optional AI-assisted cover letter generation.

## Goals

- Track job applications through a configurable pipeline
- Store notes, contacts, and status history per application
- Generate tailored cover letters on demand via LLM (optional)
- Fully deployed and accessible from any device

## Docs

- [Architecture & Design](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [API Design](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Stack

| Layer      | Choice            | Rationale                              |
|------------|-------------------|----------------------------------------|
| Frontend   | React + Vite      | Familiar, fast dev loop                |
| Backend    | Node.js + Express | Familiar, lightweight                  |
| Database   | PostgreSQL         | Relational, schema-enforced, migrations|
| Auth       | JWTs + bcrypt     | Own it end-to-end, no third-party dep  |
| Deployment | Railway           | One-click Postgres + Node, free tier   |
| AI (opt.)  | Claude Haiku API  | On-demand only, ~$0.02/call            |

## Development

```bash
# Install dependencies
npm install

# Start dev environment (requires Docker for Postgres)
npm run dev

# Run migrations
npm run migrate
```

## Project Structure

```
job-tracker/
├── client/          # React frontend
├── server/          # Express API
│   ├── routes/
│   ├── middleware/
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/
│   └── services/
├── docs/            # Design documents
└── docker-compose.yml
```
