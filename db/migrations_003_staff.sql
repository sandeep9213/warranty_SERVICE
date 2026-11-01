-- Phase 2: staff (admin / service engineer) sessions, audit reasons, ticket close time.
-- Run once on existing databases.
ALTER TABLE audit_log ADD COLUMN details TEXT;
ALTER TABLE audit_log ADD COLUMN reason TEXT;
ALTER TABLE tickets ADD COLUMN closed_at INTEGER;
CREATE TABLE IF NOT EXISTS staff_sessions (
  id          TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'engineer')),
  actor_id    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
