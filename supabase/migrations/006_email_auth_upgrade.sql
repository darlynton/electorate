-- ===========================================
-- 004 — Email-based auth upgrade
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ===========================================
-- Adds email column to user_profiles, creates phone_verifications
-- for OTP during signup, and a trigger to auto-create profiles
-- when a new auth user is created.
-- ===========================================

-- 1. Add email column to user_profiles and make phone_number nullable
ALTER TABLE user_profiles
  ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 2. Phone verification table for OTP during signup
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-delete expired verifications (optional cleanup)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires
  ON phone_verifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone
  ON phone_verifications(phone_number);

-- 3. Trigger: auto-create user_profiles on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, phone_number, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone_number = COALESCE(EXCLUDED.phone_number, user_profiles.phone_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Cleanup old phone_verifications (run periodically or via cron)
-- DELETE FROM phone_verifications WHERE expires_at < NOW();
