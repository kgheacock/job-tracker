-- Append-only. Never update or delete rows in this table.
CREATE TABLE status_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_status CHECK (
    status IN (
      'saved', 'applied', 'phone_screen', 'technical',
      'onsite', 'offer', 'rejected', 'withdrawn'
    )
  )
);

CREATE INDEX idx_status_events_job_id ON status_events (job_id);
CREATE INDEX idx_status_events_job_created ON status_events (job_id, created_at);

-- When a status_event is inserted, sync jobs.current_status
CREATE OR REPLACE FUNCTION sync_job_current_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs
  SET current_status = NEW.status,
      updated_at     = now()
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER status_events_sync_job
  AFTER INSERT ON status_events
  FOR EACH ROW
  EXECUTE FUNCTION sync_job_current_status();
