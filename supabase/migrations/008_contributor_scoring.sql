-- Migration 006: Contributor scoring & recognition
-- Adds contribution tracking columns to user_profiles and backfills from existing data.

-- ── New columns on user_profiles ────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS approved_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_score INTEGER NOT NULL DEFAULT 0;

-- ── Backfill from already-approved suggestions ──────────────────────────────
-- suggest_edit = 10 pts, add_official = 25 pts
UPDATE user_profiles up
SET
  approved_count     = sub.cnt,
  contribution_score = sub.pts
FROM (
  SELECT
    submitted_by,
    COUNT(*)::int                                                           AS cnt,
    SUM(CASE WHEN submission_type = 'add_official' THEN 25 ELSE 10 END)::int AS pts
  FROM edit_suggestions
  WHERE status = 'approved' AND submitted_by IS NOT NULL
  GROUP BY submitted_by
) sub
WHERE up.id = sub.submitted_by;

-- ── Index for leaderboard queries ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_contribution_score
  ON user_profiles (contribution_score DESC);
