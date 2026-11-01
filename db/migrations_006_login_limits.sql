-- Failed staff sign-in counters, per account and per IP, to slow down password guessing.
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT PRIMARY KEY,
  fails        INTEGER NOT NULL,
  locked_until INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
