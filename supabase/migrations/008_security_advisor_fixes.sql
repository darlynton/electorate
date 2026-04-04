-- ===========================================
-- 008 — Security Advisor fixes
-- Resolves 3 errors flagged by Supabase Security Advisor:
--   1. SECURITY DEFINER on public.politician_stats view
--   2. SECURITY DEFINER on public.politicians_with_position view
--   3. RLS disabled on public.phone_verifications
-- ===========================================

-- ───────────────────────────────────────────
-- 1 & 2. Recreate views with SECURITY INVOKER
-- DROP first because the underlying politicians table has gained
-- columns since the views were originally created, and
-- CREATE OR REPLACE VIEW cannot reorder/rename columns.
-- ───────────────────────────────────────────

DROP VIEW IF EXISTS public.politicians_with_position;
DROP VIEW IF EXISTS public.politician_stats;

CREATE VIEW public.politicians_with_position
WITH (security_invoker = true) AS
SELECT
  p.*,
  pos.title        AS current_title,
  pos.party        AS current_party,
  pos.chamber      AS current_chamber,
  pos.constituency AS current_constituency,
  pos.assembly_number,
  pos.office_level AS current_office_level
FROM politicians p
LEFT JOIN positions pos ON p.id = pos.politician_id AND pos.is_current = TRUE;

CREATE VIEW public.politician_stats
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.slug,
  p.full_name,
  p.state_of_origin,
  pos.office_level AS current_office_level,
  pos.chamber      AS current_chamber,
  (SELECT COUNT(*) FROM votes v       WHERE v.politician_id = p.id)                                    AS total_votes,
  (SELECT COUNT(*) FROM attendance a  WHERE a.politician_id = p.id AND a.present = TRUE)               AS sessions_attended,
  (SELECT COUNT(*) FROM attendance a  WHERE a.politician_id = p.id)                                    AS total_sessions,
  (SELECT COUNT(*) FROM promises pr   WHERE pr.politician_id = p.id AND pr.status = 'kept')            AS promises_kept,
  (SELECT COUNT(*) FROM promises pr   WHERE pr.politician_id = p.id AND pr.status != 'unverified')     AS promises_verified,
  (SELECT COUNT(*) FROM legal_records lr WHERE lr.politician_id = p.id AND lr.record_type = 'efcc_conviction') AS efcc_convictions,
  (SELECT COUNT(*) FROM projects pj   WHERE pj.politician_id = p.id AND pj.status = 'completed')      AS projects_completed
FROM politicians p
LEFT JOIN positions pos ON p.id = pos.politician_id AND pos.is_current = TRUE;

-- ───────────────────────────────────────────
-- 3. Enable RLS on phone_verifications
-- ───────────────────────────────────────────

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only the service_role (server-side API routes) can
-- insert, select, update, and delete OTP records.
-- No client-side / anon access is needed — OTP verification
-- is handled exclusively through our API routes.
CREATE POLICY "Service role full access on phone_verifications"
  ON public.phone_verifications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
