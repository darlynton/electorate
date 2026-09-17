-- ============================================================
-- 015 — Lock Electorate presidential poll responses
-- Community poll responses are deliberately immutable after submission.
-- ============================================================

DROP POLICY IF EXISTS "Users manage their own Electorate poll response" ON electorate_poll_responses;
DROP POLICY IF EXISTS "Users read their own Electorate poll response" ON electorate_poll_responses;
DROP POLICY IF EXISTS "Users submit their own Electorate poll response" ON electorate_poll_responses;

CREATE POLICY "Users read their own Electorate poll response"
  ON electorate_poll_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users submit their own Electorate poll response"
  ON electorate_poll_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
