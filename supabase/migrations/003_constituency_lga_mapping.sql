-- ===========================================
-- Migration 003: Constituency ↔ LGA Mapping
--
-- Purpose: Link INEC LGA IDs (from the
-- nigerian-states-lgas-and-polling-units package)
-- to NASS constituency names so that a user whose
-- LGA is known can be matched to their:
--   • Senator (via senatorial_district)
--   • House Representative (via federal_constituency)
-- ===========================================

-- -----------------------------------------------
-- Table: constituency_lga_map
-- Each row = one INEC LGA mapped to its
-- federal constituency + senatorial district.
-- lga_id / lga_name come from the INEC package.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS constituency_lga_map (
  id                        SERIAL PRIMARY KEY,
  -- INEC package IDs (string, as returned by the package)
  inec_state_id             TEXT NOT NULL,
  inec_lga_id               TEXT NOT NULL,
  -- Human-readable names (normalised to UPPERCASE for matching)
  state_name                TEXT NOT NULL,
  lga_name                  TEXT NOT NULL,
  -- NASS constituency names (as scraped from nass.gov.ng)
  federal_constituency      TEXT NOT NULL,
  senatorial_district       TEXT NOT NULL,
  -- Convenience: slug of the matching politician (populated later by seed)
  house_rep_slug            TEXT,
  senator_slug              TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (inec_lga_id)
);

-- Index for the most common lookup: inec_lga_id
CREATE INDEX IF NOT EXISTS idx_constituency_lga_map_lga
  ON constituency_lga_map (inec_lga_id);

-- Index for state-level queries
CREATE INDEX IF NOT EXISTS idx_constituency_lga_map_state
  ON constituency_lga_map (inec_state_id);

-- Full-text index on constituency names (helpful for admin search)
CREATE INDEX IF NOT EXISTS idx_constituency_lga_map_fc
  ON constituency_lga_map (federal_constituency);

-- -----------------------------------------------
-- RLS: public read, service-role write
-- -----------------------------------------------
ALTER TABLE constituency_lga_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read constituency map"
  ON constituency_lga_map FOR SELECT USING (true);

-- -----------------------------------------------
-- Function: get_user_representatives(p_lga_id TEXT)
--
-- Given an INEC LGA id, returns the matching
-- politicians (Senator + House Rep) with enough
-- detail to render a representative card.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION get_user_representatives(p_lga_id TEXT)
RETURNS TABLE (
  role              TEXT,
  politician_id     UUID,
  full_name         TEXT,
  slug              TEXT,
  photo_url         TEXT,
  party             TEXT,
  constituency      TEXT,
  state             TEXT,
  chamber           TEXT,
  office_level      TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    CASE pos.chamber
      WHEN 'Senate' THEN 'Senator'
      WHEN 'House'  THEN 'House Representative'
      ELSE pos.title
    END                   AS role,
    pol.id                AS politician_id,
    pol.full_name,
    pol.slug,
    pol.photo_url,
    pos.party,
    pos.constituency,
    pos.state,
    pos.chamber,
    'federal'::TEXT       AS office_level   -- Senate & House are always federal
  FROM constituency_lga_map clm
  JOIN politicians pol
    ON pol.slug = clm.house_rep_slug
       OR pol.slug = clm.senator_slug
  JOIN positions pos
    ON pos.politician_id = pol.id
   AND pos.is_current = TRUE
   AND pos.chamber IN ('Senate', 'House')
  WHERE clm.inec_lga_id = p_lga_id
  ORDER BY
    CASE pos.chamber WHEN 'Senate' THEN 1 WHEN 'House' THEN 2 ELSE 3 END;
$$;

-- Grant execute to authenticated users (row-level filtering not needed here)
GRANT EXECUTE ON FUNCTION get_user_representatives(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_representatives(TEXT) TO anon;
