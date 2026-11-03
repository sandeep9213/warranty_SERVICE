-- Migration 008: one buyer account per mobile number.
-- Run this after the Worker that looks up accounts by phone is deployed.
-- Data fix already applied: the empty WhatsApp-only account for 8882943147 (id 200) was merged into the
-- Google account (id 1), which was marked as phone-verified.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users (phone) WHERE phone IS NOT NULL AND phone <> '';
