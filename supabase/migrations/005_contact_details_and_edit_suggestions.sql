-- ===========================================
-- 005 — Contact details, social media & edit suggestions
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ===========================================

-- ─── 1. Expand politicians table with contact / social columns ───────────────
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS contact_phone  TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS contact_email  TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS website_url    TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS facebook_url   TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS tiktok_handle  TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS youtube_url    TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS linkedin_url   TEXT;

-- ─── 2. is_admin flag on user_profiles ───────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ─── 3. Dedicated edit_suggestions table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS edit_suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What we're editing
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  -- NULL politician_id ⇒ "add new official" request
  submission_type TEXT NOT NULL CHECK (submission_type IN ('suggest_edit', 'add_official')),

  -- The payload — stored as JSONB so the schema is flexible.
  -- suggest_edit  → { field_name, current_value, proposed_value }
  -- add_official  → { full_name, title, chamber, state, party, ... }
  payload       JSONB NOT NULL DEFAULT '{}',

  reason        TEXT,
  source_url    TEXT,
  image_url     TEXT,

  -- Review workflow
  status        TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id   UUID REFERENCES user_profiles(id),
  reviewed_at   TIMESTAMPTZ,
  reviewer_note TEXT,

  -- Who submitted
  submitted_by  UUID REFERENCES user_profiles(id),
  submitter_name  TEXT,
  submitter_email TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_status
  ON edit_suggestions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_politician
  ON edit_suggestions(politician_id);
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_submitted_by
  ON edit_suggestions(submitted_by);

-- RLS
ALTER TABLE edit_suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can read approved suggestions (public transparency)
CREATE POLICY "Public read approved suggestions"
  ON edit_suggestions FOR SELECT
  USING (status = 'approved');

-- Users can read their own pending/rejected suggestions
CREATE POLICY "Users read own suggestions"
  ON edit_suggestions FOR SELECT
  USING (auth.uid() = submitted_by);

-- Users can insert suggestions
CREATE POLICY "Users insert suggestions"
  ON edit_suggestions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- Admins can read all suggestions (using service role for API)
-- Note: admin review API uses supabaseAdmin which bypasses RLS

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_edit_suggestion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_edit_suggestion_ts ON edit_suggestions;
CREATE TRIGGER update_edit_suggestion_ts
  BEFORE UPDATE ON edit_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_edit_suggestion_timestamp();
