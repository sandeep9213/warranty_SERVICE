-- BLEAT Service & Warranty Portal — Cloudflare D1 (SQLite) schema
-- Apply: npx wrangler d1 execute bleat-service --remote --file=db/schema.sql

-- ---------- Buyers ----------
CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub     TEXT NOT NULL UNIQUE,          -- Google account id (login identity)
  google_email   TEXT NOT NULL,                 -- email on the Google account
  full_name      TEXT,                          -- Name of customer
  email          TEXT,                          -- contact email ID
  phone          TEXT,                          -- registered phone no.
  address_line1  TEXT,
  address_line2  TEXT,
  city           TEXT,
  state          TEXT,
  country        TEXT,
  postal_code    TEXT,
  consent_at     INTEGER,                       -- privacy notice accepted (epoch ms)
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,                -- SHA-256 of the cookie token (token never stored)
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ---------- Admin-managed dropdowns ----------
CREATE TABLE dropdown_options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  list_key    TEXT NOT NULL,                   -- 'product_category' | 'place_of_purchase'
  value       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_default  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (list_key, value)
);

-- ---------- Registered products ----------
CREATE TABLE products (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category           TEXT NOT NULL,
  model_name         TEXT NOT NULL,
  purchase_date      TEXT NOT NULL,            -- YYYY-MM-DD
  place_of_purchase  TEXT NOT NULL,
  dealer_name        TEXT,                     -- only when place = 'Offline Dealer'
  order_no           TEXT,                     -- required for online places, null for Offline Dealer
  serial_no          TEXT NOT NULL,            -- WIFI name (normal dashcam) or IMEI (4G dashcam)
  serial_norm        TEXT NOT NULL UNIQUE,     -- upper-cased, used to block duplicates
  reg_email          TEXT NOT NULL,
  reg_phone          TEXT NOT NULL,
  email_sent_at      INTEGER,                  -- when congratulations email was sent
  created_at         INTEGER NOT NULL
);
CREATE INDEX idx_products_user ON products(user_id);

-- ---------- Service engineers & admins ----------
CREATE TABLE admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE TABLE service_engineers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT NOT NULL UNIQUE,         -- login id (name alone is not unique)
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL
);

-- ---------- Service tickets ----------
CREATE TABLE tickets (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_no             TEXT UNIQUE,           -- BLT000001 (set right after insert)
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id            INTEGER NOT NULL REFERENCES products(id),
  issue_text            TEXT NOT NULL,
  whatsapp              TEXT NOT NULL,
  contact_email         TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending_engineer'
                        CHECK (status IN ('pending_engineer', 'pending_buyer', 'closed')),
  assigned_engineer_id  INTEGER REFERENCES service_engineers(id),
  tc_accepted_at        INTEGER NOT NULL,      -- buyer accepted warranty T&C
  closed_at             INTEGER,               -- set when closed, cleared on reopen
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE TABLE ticket_comments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_type  TEXT NOT NULL CHECK (author_type IN ('buyer', 'engineer', 'admin')),
  author_id    INTEGER,
  body         TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

-- ---------- Pickup & return shipments (point 14) ----------
CREATE TABLE shipments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id         INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  leg               TEXT NOT NULL CHECK (leg IN ('pickup', 'return')),
  courier_name      TEXT,
  awb_no            TEXT,
  condition_notes   TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  updated_at        INTEGER NOT NULL,
  UNIQUE (ticket_id, leg)
);

-- ---------- Audit trail ----------
CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type  TEXT NOT NULL,
  actor_id    INTEGER,
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   INTEGER,
  details     TEXT,                  -- JSON: before/after snapshot
  reason      TEXT,                  -- reason given for the change
  created_at  INTEGER NOT NULL
);

-- Staff (admin / service engineer) login sessions; 12 hours.
CREATE TABLE staff_sessions (
  id          TEXT PRIMARY KEY,      -- SHA-256 of the cookie token
  role        TEXT NOT NULL CHECK (role IN ('admin', 'engineer')),
  actor_id    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

-- Buyer language support (see migrations_004_language.sql)
ALTER TABLE users ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE tickets ADD COLUMN issue_lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE tickets ADD COLUMN issue_en TEXT;
ALTER TABLE ticket_comments ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE ticket_comments ADD COLUMN body_en TEXT;
CREATE TABLE IF NOT EXISTS translations (
  ref   TEXT NOT NULL,
  lang  TEXT NOT NULL,
  text  TEXT NOT NULL,
  PRIMARY KEY (ref, lang)
);

-- ---------- Bill photo copies (migration 005) ----------
-- Copy of the bill photo for each registered product. Stored compressed, as base64 text.
CREATE TABLE IF NOT EXISTS product_bills (
  product_id INTEGER PRIMARY KEY REFERENCES products(id),
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ---------- Staff sign-in attempt limits (migration 006) ----------
-- Failed staff sign-in counters, per account and per IP, to slow down password guessing.
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT PRIMARY KEY,
  fails        INTEGER NOT NULL,
  locked_until INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users (phone) WHERE phone IS NOT NULL AND phone <> '';
