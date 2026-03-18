# Data Model

## Entity Relationship

```
users
  └─< jobs             (one user → many jobs)
        └─< status_events   (one job → many status events)
        └─< contacts        (one job → many contacts)
        └─< notes           (one job → many notes)
```

## Tables

### `users`
| Column        | Type        | Notes                          |
|---------------|-------------|--------------------------------|
| id            | UUID PK     | gen_random_uuid()              |
| email         | TEXT UNIQUE | login identifier               |
| password_hash | TEXT        | bcrypt, never returned via API |
| created_at    | TIMESTAMPTZ | default now()                  |

### `jobs`
| Column          | Type        | Notes                                          |
|-----------------|-------------|------------------------------------------------|
| id              | UUID PK     |                                                |
| user_id         | UUID FK     | → users.id, cascade delete                    |
| company         | TEXT        | e.g. "Stripe"                                  |
| title           | TEXT        | e.g. "Senior Software Engineer"                |
| url             | TEXT        | job posting URL                                |
| location        | TEXT        | nullable, e.g. "Remote" or "San Francisco, CA" |
| current_status  | TEXT        | denormalized for fast queries (see below)      |
| applied_at      | DATE        | nullable until actually applied                |
| created_at      | TIMESTAMPTZ |                                                |
| updated_at      | TIMESTAMPTZ |                                                |

**Valid statuses:** `saved`, `applied`, `phone_screen`, `technical`, `onsite`, `offer`, `rejected`, `withdrawn`

**Denormalization note:** `current_status` is redundant with `status_events` but kept for cheap list queries. A DB trigger or application logic keeps it in sync when a new status event is inserted.

### `status_events`
Append-only. Never update or delete.

| Column     | Type        | Notes                  |
|------------|-------------|------------------------|
| id         | UUID PK     |                        |
| job_id     | UUID FK     | → jobs.id, cascade     |
| status     | TEXT        | the new status         |
| note       | TEXT        | optional context       |
| created_at | TIMESTAMPTZ | when the change happened |

### `contacts`
People at the company associated with the application.

| Column     | Type    | Notes               |
|------------|---------|---------------------|
| id         | UUID PK |                     |
| job_id     | UUID FK | → jobs.id, cascade  |
| name       | TEXT    |                     |
| role       | TEXT    | nullable            |
| email      | TEXT    | nullable            |
| linkedin   | TEXT    | nullable            |
| notes      | TEXT    | nullable            |

### `notes`
Free-form notes on a job (separate from status event notes for flexibility).

| Column     | Type        | Notes              |
|------------|-------------|--------------------|
| id         | UUID PK     |                    |
| job_id     | UUID FK     | → jobs.id, cascade |
| body       | TEXT        |                    |
| created_at | TIMESTAMPTZ |                    |

## Key Design Decisions

**UUIDs over serial IDs.** No sequential enumeration of other users' resources.

**Cascade deletes.** Deleting a job removes its events, contacts, and notes. Deleting a user removes all their jobs (and by cascade, everything else).

**`applied_at` vs `created_at`.** A job can be saved before applying. `applied_at` is set when the user marks it applied, not when the row is created.

**Status as text, not enum.** Easier to add new statuses without a migration. Validated at the application layer.
