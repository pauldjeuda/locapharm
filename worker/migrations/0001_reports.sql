CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY NOT NULL,
  pharmacy_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('correction', 'missing', 'duty_list')),
  reasons_json TEXT NOT NULL CHECK (json_valid(reasons_json)),
  details_ciphertext TEXT CHECK (
    details_ciphertext IS NULL OR length(details_ciphertext) <= 4096
  ),
  details_iv TEXT CHECK (details_iv IS NULL OR length(details_iv) = 16),
  proposed_lat REAL,
  proposed_lon REAL,
  contact_ciphertext TEXT,
  contact_iv TEXT CHECK (contact_iv IS NULL OR length(contact_iv) = 16),
  installation_hash TEXT NOT NULL CHECK (length(installation_hash) = 64),
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'ignored')),
  CHECK (
    (kind = 'missing' AND pharmacy_id IS NULL) OR
    (kind IN ('correction', 'duty_list') AND pharmacy_id IS NOT NULL)
  ),
  CHECK (
    (proposed_lat IS NULL AND proposed_lon IS NULL) OR
    (
      proposed_lat IS NOT NULL AND proposed_lon IS NOT NULL AND
      proposed_lat BETWEEN 1.3 AND 13.5 AND proposed_lon BETWEEN 8 AND 16.5
    )
  ),
  CHECK (kind != 'missing' OR proposed_lat IS NOT NULL),
  CHECK (
    (contact_ciphertext IS NULL AND contact_iv IS NULL) OR
    (contact_ciphertext IS NOT NULL AND contact_iv IS NOT NULL)
  ),
  CHECK (
    (details_ciphertext IS NULL AND details_iv IS NULL) OR
    (details_ciphertext IS NOT NULL AND details_iv IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS reports_pending_created
  ON reports(status, created_at);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY NOT NULL,
  pharmacy_id TEXT NOT NULL,
  duty_window_id TEXT NOT NULL CHECK (length(duty_window_id) = 36),
  vote TEXT NOT NULL CHECK (vote IN ('on_duty', 'closed')),
  installation_hash TEXT NOT NULL CHECK (length(installation_hash) = 64),
  created_at INTEGER NOT NULL,
  UNIQUE (pharmacy_id, duty_window_id, installation_hash)
);

CREATE INDEX IF NOT EXISTS votes_recent_summary
  ON votes(pharmacy_id, duty_window_id, vote, created_at);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY NOT NULL,
  message_ciphertext TEXT NOT NULL CHECK (length(message_ciphertext) <= 8192),
  message_iv TEXT NOT NULL CHECK (length(message_iv) = 16),
  diagnostics_json TEXT NOT NULL CHECK (json_valid(diagnostics_json)),
  diagnostics_opt_in INTEGER NOT NULL CHECK (diagnostics_opt_in IN (0, 1)),
  installation_hash TEXT NOT NULL CHECK (length(installation_hash) = 64),
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'ignored'))
);

CREATE INDEX IF NOT EXISTS feedback_pending_created
  ON feedback(status, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_hash TEXT PRIMARY KEY NOT NULL CHECK (length(bucket_hash) = 64),
  window_started_at INTEGER NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0)
);
