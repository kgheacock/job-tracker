CREATE TABLE contacts (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id   UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  role     TEXT,
  email    TEXT,
  linkedin TEXT,
  notes    TEXT
);

CREATE INDEX idx_contacts_job_id ON contacts (job_id);
