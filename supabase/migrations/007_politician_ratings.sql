-- ============================================================
-- 007 – Crowd-sourced politician scoring system
-- Users rate politicians on 5 dimensions (1-5 stars), once per month
-- Dimensions differ by office type (legislator vs executive)
-- ============================================================

CREATE TABLE IF NOT EXISTS politician_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  rating_period TEXT NOT NULL, -- 'YYYY-MM' format e.g. '2026-03'

  -- ── Legislator dimensions (1-5 stars, NULL for executives) ──
  constituency_presence SMALLINT CHECK (constituency_presence BETWEEN 1 AND 5),
  legislative_activity  SMALLINT CHECK (legislative_activity  BETWEEN 1 AND 5),
  constituency_projects SMALLINT CHECK (constituency_projects BETWEEN 1 AND 5),
  accessibility         SMALLINT CHECK (accessibility         BETWEEN 1 AND 5),
  transparency          SMALLINT CHECK (transparency          BETWEEN 1 AND 5),

  -- ── Executive dimensions (1-5 stars, NULL for legislators) ──
  infrastructure              SMALLINT CHECK (infrastructure              BETWEEN 1 AND 5),
  security                    SMALLINT CHECK (security                    BETWEEN 1 AND 5),
  healthcare_education        SMALLINT CHECK (healthcare_education        BETWEEN 1 AND 5),
  economic_activity           SMALLINT CHECK (economic_activity           BETWEEN 1 AND 5),
  transparency_communication  SMALLINT CHECK (transparency_communication  BETWEEN 1 AND 5),

  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Enforce once-per-month per user per politician
  CONSTRAINT unique_user_politician_period UNIQUE(user_id, politician_id, rating_period)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_politician_ratings_politician ON politician_ratings(politician_id);
CREATE INDEX IF NOT EXISTS idx_politician_ratings_user       ON politician_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_politician_ratings_period     ON politician_ratings(rating_period);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE politician_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings (needed for aggregation)
DO $$ BEGIN
  CREATE POLICY "Anyone can read ratings"
    ON politician_ratings FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can insert their own ratings
DO $$ BEGIN
  CREATE POLICY "Users can insert own ratings"
    ON politician_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update their own ratings (e.g. re-submit within the same month)
DO $$ BEGIN
  CREATE POLICY "Users can update own ratings"
    ON politician_ratings FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
