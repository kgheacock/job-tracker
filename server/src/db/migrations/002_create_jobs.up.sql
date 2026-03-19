CREATE TABLE jobs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company        TEXT        NOT NULL,
  title          TEXT        NOT NULL,
  url            TEXT,
  location       TEXT,
  current_status TEXT        NOT NULL DEFAULT 'saved',
  applied_at     DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_status CHECK (
    current_status IN (
      'saved', 'applied', 'phone_screen', 'technical',
      'onsite', 'offer', 'rejected', 'withdrawn'
    )
  )
);

CREATE INDEX idx_jobs_user_id ON jobs (user_id);
CREATE INDEX idx_jobs_user_status ON jobs (user_id, current_status);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_set_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
