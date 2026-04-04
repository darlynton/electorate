-- ===========================================
-- Migration 003: Phone Auth + Geographic User Profiles + Political Mapping
-- ===========================================
-- NOTE: The inec_states / inec_lgas / inec_wards / inec_polling_units tables
-- are defined here for production use. During development the geo API routes
-- serve data directly from the nigerian-states-lgas-and-polling-units npm
-- package — no need to seed 202k rows locally.
-- Run `npx tsx scripts/seed-inec-data.ts` only when preparing for production.
-- ===========================================

-- ===========================================
-- INEC GEOGRAPHIC TABLES (production only — optional in dev)
-- ===========================================

CREATE TABLE IF NOT EXISTS inec_states (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inec_lgas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state_id TEXT NOT NULL REFERENCES inec_states(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, state_id)
);

CREATE TABLE IF NOT EXISTS inec_wards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lga_id TEXT NOT NULL REFERENCES inec_lgas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, lga_id)
);

CREATE TABLE IF NOT EXISTS inec_polling_units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ward_id TEXT NOT NULL REFERENCES inec_wards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cascading lookups
CREATE INDEX IF NOT EXISTS idx_inec_lgas_state ON inec_lgas(state_id);
CREATE INDEX IF NOT EXISTS idx_inec_wards_lga ON inec_wards(lga_id);
CREATE INDEX IF NOT EXISTS idx_inec_pus_ward ON inec_polling_units(ward_id);
CREATE INDEX IF NOT EXISTS idx_inec_states_name ON inec_states(name);
CREATE INDEX IF NOT EXISTS idx_inec_lgas_name ON inec_lgas(name);

-- ===========================================
-- POLITICAL MAPPING TABLES
-- ===========================================

CREATE TABLE IF NOT EXISTS senatorial_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state_id TEXT NOT NULL REFERENCES inec_states(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, state_id)
);

CREATE TABLE IF NOT EXISTS federal_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state_id TEXT NOT NULL REFERENCES inec_states(id) ON DELETE CASCADE,
  senatorial_district_id UUID REFERENCES senatorial_districts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, state_id)
);

CREATE TABLE IF NOT EXISTS state_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state_id TEXT NOT NULL REFERENCES inec_states(id) ON DELETE CASCADE,
  federal_constituency_id UUID REFERENCES federal_constituencies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, state_id)
);

CREATE TABLE IF NOT EXISTS lga_chairmanships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lga_id TEXT NOT NULL UNIQUE REFERENCES inec_lgas(id) ON DELETE CASCADE,
  senatorial_district_id UUID REFERENCES senatorial_districts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping: LGAs → Senatorial Districts
CREATE INDEX IF NOT EXISTS idx_lga_chairmanships_sd ON lga_chairmanships(senatorial_district_id);

-- Mapping: Wards → Federal/State Constituencies (nullable — populated later)
ALTER TABLE inec_wards ADD COLUMN IF NOT EXISTS federal_constituency_id UUID REFERENCES federal_constituencies(id);
ALTER TABLE inec_wards ADD COLUMN IF NOT EXISTS state_constituency_id UUID REFERENCES state_constituencies(id);

CREATE INDEX IF NOT EXISTS idx_wards_fc ON inec_wards(federal_constituency_id);
CREATE INDEX IF NOT EXISTS idx_wards_sc ON inec_wards(state_constituency_id);

-- Political mapping indexes
CREATE INDEX IF NOT EXISTS idx_senatorial_districts_state ON senatorial_districts(state_id);
CREATE INDEX IF NOT EXISTS idx_federal_constituencies_state ON federal_constituencies(state_id);
CREATE INDEX IF NOT EXISTS idx_state_constituencies_state ON state_constituencies(state_id);

-- ===========================================
-- USER PROFILE TABLE (extends Supabase Auth)
-- IDs stored as plain TEXT — foreign keys to inec_* tables are only enforced
-- once you seed the INEC geographic data (production). In development the
-- geo API routes validate IDs via the npm package, not the DB.
-- ===========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  display_name TEXT,
  state_id TEXT,
  lga_id TEXT,
  ward_id TEXT,
  polling_unit_id TEXT,
  location_verified BOOLEAN DEFAULT FALSE,
  location_last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_state ON user_profiles(state_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_lga ON user_profiles(lga_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_pu ON user_profiles(polling_unit_id);

-- ===========================================
-- RLS for new tables
-- ===========================================

ALTER TABLE inec_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE inec_lgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inec_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE inec_polling_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE senatorial_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE federal_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lga_chairmanships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public read for geographic data
CREATE POLICY "Public read inec_states" ON inec_states FOR SELECT USING (true);
CREATE POLICY "Public read inec_lgas" ON inec_lgas FOR SELECT USING (true);
CREATE POLICY "Public read inec_wards" ON inec_wards FOR SELECT USING (true);
CREATE POLICY "Public read inec_polling_units" ON inec_polling_units FOR SELECT USING (true);
CREATE POLICY "Public read senatorial_districts" ON senatorial_districts FOR SELECT USING (true);
CREATE POLICY "Public read federal_constituencies" ON federal_constituencies FOR SELECT USING (true);
CREATE POLICY "Public read state_constituencies" ON state_constituencies FOR SELECT USING (true);
CREATE POLICY "Public read lga_chairmanships" ON lga_chairmanships FOR SELECT USING (true);

-- User profiles: users can read own, update own
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profile_timestamp_trigger ON user_profiles;
CREATE TRIGGER update_user_profile_timestamp_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_timestamp();

-- ===========================================
-- HELPER: Check if user can change location (6 month rule)
-- ===========================================

CREATE OR REPLACE FUNCTION can_update_location(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_updated TIMESTAMPTZ;
BEGIN
  SELECT location_last_updated_at INTO last_updated
  FROM user_profiles WHERE id = user_uuid;

  IF last_updated IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN (NOW() - last_updated) > INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
