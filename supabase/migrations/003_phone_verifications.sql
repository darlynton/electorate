-- ===========================================
-- Migration 003: Phone verification + OTP support
-- ===========================================

-- Phone verifications table (used by /api/v1/auth/send-otp & verify-otp)
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index: look up the latest active OTP for a phone
CREATE INDEX IF NOT EXISTS idx_phone_verif_phone
  ON phone_verifications(phone_number, verified, created_at DESC);

-- Index: auto-cleanup of expired rows
CREATE INDEX IF NOT EXISTS idx_phone_verif_expires
  ON phone_verifications(expires_at)
  WHERE verified = FALSE;

-- Rate limiting table — tracks per-phone send cadence
CREATE TABLE IF NOT EXISTS otp_rate_limits (
  phone_number TEXT PRIMARY KEY,
  sent_count INT DEFAULT 1,
  first_sent_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service-role (server) can touch these tables
-- No public/anon access
CREATE POLICY "Service role only — phone_verifications"
  ON phone_verifications
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role only — otp_rate_limits"
  ON otp_rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ===========================================
-- Cleanup function: delete expired verifications
-- Run via pg_cron or Supabase scheduled function
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verifications
  WHERE expires_at < NOW() - INTERVAL '1 hour';

  -- Reset daily rate limit counters (older than 24h)
  DELETE FROM otp_rate_limits
  WHERE first_sent_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
