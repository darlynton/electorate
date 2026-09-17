-- ============================================================
-- 014 — Electorate presidential poll
-- Authenticated community voting-intention responses. This is an
-- Electorate audience poll, not a representative scientific survey.
-- ============================================================

CREATE TABLE IF NOT EXISTS electorate_poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_race_id UUID NOT NULL REFERENCES election_races(id) ON DELETE CASCADE,
  candidacy_id UUID NOT NULL REFERENCES candidacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_race_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_electorate_poll_responses_race
  ON electorate_poll_responses(election_race_id, candidacy_id);

ALTER TABLE electorate_poll_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own Electorate poll response" ON electorate_poll_responses;
CREATE POLICY "Users manage their own Electorate poll response"
  ON electorate_poll_responses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
