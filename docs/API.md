# API Design

Base path: `/api`  
All endpoints return JSON. All protected endpoints require `Authorization: Bearer <token>`.

## Auth

### `POST /api/auth/register`
Create a new account.

**Body:** `{ email, password }`  
**Returns:** `{ token, refreshToken, user: { id, email } }`

### `POST /api/auth/login`
**Body:** `{ email, password }`  
**Returns:** `{ token, refreshToken, user: { id, email } }`

### `POST /api/auth/refresh`
Exchange a refresh token for a new access token.  
**Body:** `{ refreshToken }`  
**Returns:** `{ token }`

---

## Jobs

All job routes are protected (require auth).

### `GET /api/jobs`
List all jobs for the authenticated user.  
**Query params:** `status`, `search`, `sort` (e.g. `?status=applied&sort=applied_at`)  
**Returns:** `{ jobs: [ ...job objects ] }`

### `POST /api/jobs`
Create a new job.  
**Body:** `{ company, title, url?, location?, status? }`  
**Returns:** `{ job }`

### `GET /api/jobs/:id`
Get a single job with full detail: status history, contacts, notes.  
**Returns:** `{ job, statusEvents, contacts, notes }`

### `PATCH /api/jobs/:id`
Update job fields (company, title, url, location).  
**Body:** partial job fields  
**Returns:** `{ job }`

### `DELETE /api/jobs/:id`
Delete a job and all related records.  
**Returns:** `204 No Content`

---

## Status Events

### `POST /api/jobs/:id/status`
Advance or change the status of a job. Inserts a new status_event row and updates `jobs.current_status`.

**Body:** `{ status, note? }`  
**Returns:** `{ statusEvent, job }`

---

## Contacts

### `POST /api/jobs/:id/contacts`
**Body:** `{ name, role?, email?, linkedin?, notes? }`  
**Returns:** `{ contact }`

### `DELETE /api/contacts/:id`
**Returns:** `204 No Content`

---

## Notes

### `POST /api/jobs/:id/notes`
**Body:** `{ body }`  
**Returns:** `{ note }`

### `DELETE /api/notes/:id`
**Returns:** `204 No Content`

---

## AI (optional)

### `POST /api/ai/cover-letter`
Generate a tailored cover letter for a job. Returns 501 if `CLAUDE_API_KEY` is not configured.

**Body:** `{ jobId, resumeText }`  
**Returns:** `{ coverLetter: "..." }`

---

## Error Shape

All errors follow a consistent shape:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email is required",
    "details": { ... }
  }
}
```

**Standard HTTP codes:**
- `400` — validation / bad input
- `401` — missing or invalid auth token
- `403` — authenticated but not authorized (e.g. accessing another user's job)
- `404` — resource not found
- `409` — conflict (e.g. duplicate email on register)
- `500` — unexpected server error
- `501` — feature not configured (AI routes without API key)
