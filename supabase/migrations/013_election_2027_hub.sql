-- ============================================================
-- 013 — Election 2027 hub
-- Normalized election, candidacy, polling, and timetable data.
-- Politicians, users, and INEC geography remain canonical elsewhere.
-- ============================================================

CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  election_type TEXT NOT NULL CHECK (election_type IN ('general', 'by_election', 'primary', 'other')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  last_verified_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS election_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  office TEXT NOT NULL CHECK (office IN ('president', 'senate', 'house_of_representatives', 'governor', 'state_assembly')),
  scope TEXT NOT NULL CHECK (scope IN ('national', 'state', 'senatorial_district', 'federal_constituency', 'state_constituency')),
  election_date DATE NOT NULL,
  state_id TEXT REFERENCES inec_states(id) ON DELETE SET NULL,
  senatorial_district_id UUID REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id UUID REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id UUID REFERENCES state_constituencies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (election_id, office, scope, state_id, senatorial_district_id, federal_constituency_id, state_constituency_id)
);

CREATE TABLE IF NOT EXISTS candidacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_race_id UUID NOT NULL REFERENCES election_races(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE RESTRICT,
  party TEXT,
  status TEXT NOT NULL CHECK (status IN ('reported', 'declared', 'nominated', 'confirmed', 'withdrawn', 'disqualified', 'elected')),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  announced_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_race_id, politician_id)
);

CREATE TABLE IF NOT EXISTS election_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  scope TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('electoral_process', 'campaign', 'registration', 'election', 'deadline')),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_id, event_date, title, scope)
);

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_race_id UUID NOT NULL REFERENCES election_races(id) ON DELETE CASCADE,
  pollster TEXT NOT NULL,
  fieldwork_start DATE,
  fieldwork_end DATE,
  published_at DATE NOT NULL,
  sample_size INTEGER CHECK (sample_size > 0),
  population TEXT,
  sampling_method TEXT,
  mode TEXT,
  geographic_scope TEXT NOT NULL CHECK (geographic_scope IN ('national', 'geopolitical_zone', 'state', 'urban_rural')),
  methodology TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  candidacy_id UUID REFERENCES candidacies(id) ON DELETE CASCADE,
  result_type TEXT NOT NULL CHECK (result_type IN ('candidate', 'undecided', 'other', 'refused', 'would_not_vote')),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  respondent_count INTEGER CHECK (respondent_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((result_type = 'candidate' AND candidacy_id IS NOT NULL) OR (result_type <> 'candidate' AND candidacy_id IS NULL)),
  UNIQUE NULLS NOT DISTINCT (poll_id, candidacy_id, result_type)
);

-- Geographic breakdowns are stored only when a poll source publishes them.
CREATE TABLE IF NOT EXISTS poll_geographic_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  geography_type TEXT NOT NULL CHECK (geography_type IN ('geopolitical_zone', 'state', 'urban_rural')),
  geography_key TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, geography_type, geography_key)
);

CREATE TABLE IF NOT EXISTS poll_geographic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_geographic_breakdown_id UUID NOT NULL REFERENCES poll_geographic_breakdowns(id) ON DELETE CASCADE,
  candidacy_id UUID REFERENCES candidacies(id) ON DELETE CASCADE,
  result_type TEXT NOT NULL CHECK (result_type IN ('candidate', 'undecided', 'other', 'refused', 'would_not_vote')),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  respondent_count INTEGER CHECK (respondent_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((result_type = 'candidate' AND candidacy_id IS NOT NULL) OR (result_type <> 'candidate' AND candidacy_id IS NULL)),
  UNIQUE NULLS NOT DISTINCT (poll_geographic_breakdown_id, candidacy_id, result_type)
);

CREATE INDEX IF NOT EXISTS idx_election_races_election ON election_races(election_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_race_status ON candidacies(election_race_id, status);
CREATE INDEX IF NOT EXISTS idx_timeline_events_election_date ON election_timeline_events(election_id, event_date);
CREATE INDEX IF NOT EXISTS idx_polls_race_published ON polls(election_race_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_results_poll ON poll_results(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_breakdowns_poll ON poll_geographic_breakdowns(poll_id);

ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_geographic_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_geographic_results ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'elections', 'election_races', 'candidacies', 'election_timeline_events',
    'polls', 'poll_results', 'poll_geographic_breakdowns', 'poll_geographic_results'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %s" ON %I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Public read %s" ON %I FOR SELECT USING (true)', table_name, table_name);
  END LOOP;
END $$;

INSERT INTO elections (slug, name, election_type, status, source_name, source_url, last_verified_at)
VALUES (
  'nigeria-general-election-2027',
  '2027 Nigerian General Election',
  'general',
  'upcoming',
  'Independent National Electoral Commission (INEC)',
  'https://www.inecnigeria.org/wp-content/uploads/2027-GENERAL-ELECTION-TIMETABLE.pdf',
  '2026-09-15'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  last_verified_at = EXCLUDED.last_verified_at,
  updated_at = NOW();

INSERT INTO election_races (election_id, slug, office, scope, election_date, status)
SELECT id, '2027-president-national', 'president', 'national', '2027-02-20', 'upcoming'
FROM elections WHERE slug = 'nigeria-general-election-2027'
ON CONFLICT (slug) DO UPDATE SET election_date = EXCLUDED.election_date, updated_at = NOW();

INSERT INTO election_timeline_events (election_id, event_date, title, scope, category, source_name, source_url)
SELECT e.id, event_date, title, scope, category, e.source_name, e.source_url
FROM elections e
CROSS JOIN (VALUES
  ('2026-09-23'::DATE, 'Campaigns begin', 'Presidential & National Assembly', 'campaign'),
  ('2026-10-07'::DATE, 'Campaigns begin', 'Governorship & State Assembly', 'campaign'),
  ('2027-01-11'::DATE, 'Official Register of Voters published', 'National', 'registration'),
  ('2027-01-21'::DATE, 'Notice of Poll published', 'National', 'electoral_process'),
  ('2027-02-18'::DATE, 'Campaigns end', 'Presidential & National Assembly', 'deadline'),
  ('2027-02-20'::DATE, 'Presidential & National Assembly election', 'National', 'election'),
  ('2027-03-04'::DATE, 'Campaigns end', 'Governorship & State Assembly', 'deadline'),
  ('2027-03-06'::DATE, 'Governorship & State Assembly election', 'National', 'election')
) AS events(event_date, title, scope, category)
WHERE e.slug = 'nigeria-general-election-2027'
ON CONFLICT (election_id, event_date, title, scope) DO UPDATE SET
  category = EXCLUDED.category,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url;