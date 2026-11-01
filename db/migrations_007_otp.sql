-- WhatsApp OTP sign-in. Codes are stored as salted hashes, never in plain text.
CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes (phone, created_at);
CREATE INDEX IF NOT EXISTS idx_otp_ip ON otp_codes (ip, created_at);
ALTER TABLE users ADD COLUMN phone_verified_at INTEGER;
