-- ===========================================
-- Migration: Expand to all elected officials
-- Adds office_level to positions, broadens
-- attendance session types, and updates views
-- ===========================================

-- 1. Add office_level column to positions
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS office_level TEXT DEFAULT 'federal';

-- Backfill existing rows (all current data is federal legislators)
UPDATE positions SET office_level = 'federal' WHERE office_level IS NULL;

-- Add CHECK constraint
ALTER TABLE positions
  ADD CONSTRAINT positions_office_level_check
  CHECK (office_level IN ('federal', 'state', 'local'));

-- 2. Broaden attendance session_type to cover executive sessions
--    Drop the old CHECK and add a new one
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_session_type_check;

-- Handle case where constraint name differs (Supabase auto-naming)
DO $$
BEGIN
  -- Try to drop any check constraint on session_type
  EXECUTE (
    SELECT 'ALTER TABLE attendance DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'attendance'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%session_type%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  -- No constraint found, continue
  NULL;
END $$;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_session_type_check
  CHECK (session_type IN ('plenary', 'committee', 'special', 'cabinet', 'executive_council'));

-- 3. Add index on office_level for efficient filtering
CREATE INDEX IF NOT EXISTS idx_positions_office_level ON positions(office_level);

-- 4. Composite index for common filter: office_level + is_current
CREATE INDEX IF NOT EXISTS idx_positions_level_current
  ON positions(office_level, is_current) WHERE is_current = TRUE;

-- 5. Update the materialized view to include office_level
DROP VIEW IF EXISTS politician_stats;
DROP VIEW IF EXISTS politicians_with_position;
CREATE OR REPLACE VIEW politicians_with_position AS
SELECT
  p.*,
  pos.title AS current_title,
  pos.party AS current_party,
  pos.chamber AS current_chamber,
  pos.constituency AS current_constituency,
  pos.assembly_number,
  pos.office_level AS current_office_level
FROM politicians p
LEFT JOIN positions pos ON p.id = pos.politician_id AND pos.is_current = TRUE;

-- 6. Update politician_stats view (unchanged logic, just re-create for clarity)
CREATE OR REPLACE VIEW politician_stats AS
SELECT
  p.id,
  p.slug,
  p.full_name,
  p.state_of_origin,
  pos.office_level AS current_office_level,
  pos.chamber AS current_chamber,
  (SELECT COUNT(*) FROM votes v WHERE v.politician_id = p.id) AS total_votes,
  (SELECT COUNT(*) FROM attendance a WHERE a.politician_id = p.id AND a.present = TRUE) AS sessions_attended,
  (SELECT COUNT(*) FROM attendance a WHERE a.politician_id = p.id) AS total_sessions,
  (SELECT COUNT(*) FROM promises pr WHERE pr.politician_id = p.id AND pr.status = 'kept') AS promises_kept,
  (SELECT COUNT(*) FROM promises pr WHERE pr.politician_id = p.id AND pr.status != 'unverified') AS promises_verified,
  (SELECT COUNT(*) FROM legal_records lr WHERE lr.politician_id = p.id AND lr.record_type = 'efcc_conviction') AS efcc_convictions,
  (SELECT COUNT(*) FROM projects pj WHERE pj.politician_id = p.id AND pj.status = 'completed') AS projects_completed
FROM politicians p
LEFT JOIN positions pos ON p.id = pos.politician_id AND pos.is_current = TRUE;
