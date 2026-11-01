-- Buyer language support: buyers write and read in their own language; the service team reads English.
-- Run once on the live database.
ALTER TABLE users ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE tickets ADD COLUMN issue_lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE tickets ADD COLUMN issue_en TEXT;
ALTER TABLE ticket_comments ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE ticket_comments ADD COLUMN body_en TEXT;
-- Cached translations. ref is 't:<ticket id>' for the issue or 'c:<comment id>' for a comment.
CREATE TABLE IF NOT EXISTS translations (
  ref   TEXT NOT NULL,
  lang  TEXT NOT NULL,
  text  TEXT NOT NULL,
  PRIMARY KEY (ref, lang)
);
