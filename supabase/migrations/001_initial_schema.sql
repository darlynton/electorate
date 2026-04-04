-- ===========================================
-- NaijaRep Database Schema
-- Run this migration in your Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- POLITICIANS
-- ===========================================
CREATE TABLE IF NOT EXISTS politicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  photo_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  state_of_origin TEXT NOT NULL,
  lga_of_origin TEXT,
  education JSONB DEFAULT '[]',
  biography TEXT,
  nin_partial TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- POSITIONS (current and historical)
-- ===========================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  chamber TEXT CHECK (chamber IN ('Senate', 'House', 'State Assembly', 'Executive')),
  constituency TEXT,
  state TEXT,
  party TEXT NOT NULL,
  assembly_number INT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- VOTING RECORDS
-- ===========================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  bill_title TEXT NOT NULL,
  bill_id TEXT,
  vote_cast TEXT CHECK (vote_cast IN ('for', 'against', 'abstain', 'absent')),
  vote_date DATE NOT NULL,
  session TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ATTENDANCE RECORDS
-- ===========================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_type TEXT CHECK (session_type IN ('plenary', 'committee')),
  present BOOLEAN NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- CAMPAIGN PROMISES
-- ===========================================
CREATE TABLE IF NOT EXISTS promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  promise_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('infrastructure', 'health', 'education', 'security', 'economy', 'agriculture', 'other')),
  status TEXT CHECK (status IN ('kept', 'broken', 'in_progress', 'abandoned', 'unverified')) DEFAULT 'unverified',
  evidence_url TEXT,
  source TEXT,
  made_date DATE,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- LEGAL & CORRUPTION RECORDS
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  record_type TEXT CHECK (record_type IN ('efcc_investigation', 'efcc_conviction', 'icpc_prosecution', 'court_judgment', 'cct_proceedings', 'acquittal')),
  title TEXT NOT NULL,
  description TEXT,
  case_number TEXT,
  court TEXT,
  date DATE,
  outcome TEXT,
  source_url TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- NEWS ARTICLES (aggregated)
-- ===========================================
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  excerpt TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  published_at TIMESTAMPTZ,
  category TEXT CHECK (category IN ('corruption', 'legislation', 'constituency', 'general')),
  is_verified_source BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- CONSTITUENCY PROJECTS
-- ===========================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('road', 'health', 'school', 'water', 'electricity', 'other')),
  state TEXT,
  lga TEXT,
  allocated_amount BIGINT,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
  budget_year INT,
  evidence_photos TEXT[] DEFAULT '{}',
  source_url TEXT,
  reported_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ASSET DECLARATIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS asset_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  declaration_year INT NOT NULL,
  status TEXT CHECK (status IN ('filed', 'not_filed', 'filed_not_public', 'unknown')) DEFAULT 'unknown',
  document_url TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USERS (citizens)
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  state TEXT,
  lga TEXT,
  is_verified_voter BOOLEAN DEFAULT FALSE,
  points INT DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  streak_days INT DEFAULT 0,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USER TIPS / SUBMISSIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  politician_id UUID REFERENCES politicians(id),
  tip_type TEXT CHECK (tip_type IN ('broken_promise', 'project_update', 'corruption_allegation', 'news_tip', 'correction')),
  content TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ELECTION PREDICTIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  race_id TEXT NOT NULL,
  predicted_winner TEXT NOT NULL,
  is_correct BOOLEAN,
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, race_id)
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_politicians_slug ON politicians(slug);
CREATE INDEX IF NOT EXISTS idx_politicians_state ON politicians(state_of_origin);
CREATE INDEX IF NOT EXISTS idx_politicians_name ON politicians(full_name);
CREATE INDEX IF NOT EXISTS idx_positions_politician ON positions(politician_id);
CREATE INDEX IF NOT EXISTS idx_positions_current ON positions(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_positions_party ON positions(party);
CREATE INDEX IF NOT EXISTS idx_votes_politician ON votes(politician_id);
CREATE INDEX IF NOT EXISTS idx_votes_date ON votes(vote_date);
CREATE INDEX IF NOT EXISTS idx_attendance_politician ON attendance(politician_id);
CREATE INDEX IF NOT EXISTS idx_promises_politician ON promises(politician_id);
CREATE INDEX IF NOT EXISTS idx_promises_status ON promises(status);
CREATE INDEX IF NOT EXISTS idx_legal_records_politician ON legal_records(politician_id);
CREATE INDEX IF NOT EXISTS idx_news_politician ON news_articles(politician_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_politician ON projects(politician_id);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status);
CREATE INDEX IF NOT EXISTS idx_tips_user ON tips(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_race ON predictions(race_id);

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Public read access for politician data
CREATE POLICY "Public read access for politicians" ON politicians FOR SELECT USING (true);
CREATE POLICY "Public read access for positions" ON positions FOR SELECT USING (true);
CREATE POLICY "Public read access for votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Public read access for attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Public read access for promises" ON promises FOR SELECT USING (true);
CREATE POLICY "Public read access for legal_records" ON legal_records FOR SELECT USING (true);
CREATE POLICY "Public read access for news_articles" ON news_articles FOR SELECT USING (true);
CREATE POLICY "Public read access for projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access for asset_declarations" ON asset_declarations FOR SELECT USING (true);

-- Users can read their own data and public profiles
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Tips: users can create, read own tips
CREATE POLICY "Users can create tips" ON tips FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can read own tips" ON tips FOR SELECT USING (auth.uid()::text = user_id::text OR status = 'verified');

-- Predictions: users can create and read own
CREATE POLICY "Users can create predictions" ON predictions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can read own predictions" ON predictions FOR SELECT USING (true);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function to add points to a user
CREATE OR REPLACE FUNCTION add_user_points(user_id UUID, points_to_add INT)
RETURNS users AS $$
DECLARE
  updated_user users;
BEGIN
  UPDATE users
  SET points = points + points_to_add,
      last_active = NOW()
  WHERE id = user_id
  RETURNING * INTO updated_user;
  
  RETURN updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update politician timestamp
CREATE OR REPLACE FUNCTION update_politician_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for politician updates
DROP TRIGGER IF EXISTS update_politician_timestamp_trigger ON politicians;
CREATE TRIGGER update_politician_timestamp_trigger
  BEFORE UPDATE ON politicians
  FOR EACH ROW
  EXECUTE FUNCTION update_politician_timestamp();

-- Trigger for promise updates
DROP TRIGGER IF EXISTS update_promise_timestamp_trigger ON promises;
CREATE TRIGGER update_promise_timestamp_trigger
  BEFORE UPDATE ON promises
  FOR EACH ROW
  EXECUTE FUNCTION update_politician_timestamp();

-- Trigger for project updates
DROP TRIGGER IF EXISTS update_project_timestamp_trigger ON projects;
CREATE TRIGGER update_project_timestamp_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_politician_timestamp();

-- ===========================================
-- FULL TEXT SEARCH
-- ===========================================

-- Add full text search column to politicians
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(state_of_origin, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(biography, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_politicians_fts ON politicians USING GIN (fts);

-- ===========================================
-- VIEWS FOR COMMON QUERIES
-- ===========================================

-- View for politicians with current position
CREATE OR REPLACE VIEW politicians_with_position AS
SELECT 
  p.*,
  pos.title as current_title,
  pos.party as current_party,
  pos.chamber as current_chamber,
  pos.constituency as current_constituency,
  pos.assembly_number
FROM politicians p
LEFT JOIN positions pos ON p.id = pos.politician_id AND pos.is_current = TRUE;

-- View for politician stats
CREATE OR REPLACE VIEW politician_stats AS
SELECT 
  p.id,
  p.slug,
  p.full_name,
  p.state_of_origin,
  (SELECT COUNT(*) FROM votes v WHERE v.politician_id = p.id) as total_votes,
  (SELECT COUNT(*) FROM attendance a WHERE a.politician_id = p.id AND a.present = TRUE) as sessions_attended,
  (SELECT COUNT(*) FROM attendance a WHERE a.politician_id = p.id) as total_sessions,
  (SELECT COUNT(*) FROM promises pr WHERE pr.politician_id = p.id AND pr.status = 'kept') as promises_kept,
  (SELECT COUNT(*) FROM promises pr WHERE pr.politician_id = p.id AND pr.status != 'unverified') as promises_verified,
  (SELECT COUNT(*) FROM legal_records lr WHERE lr.politician_id = p.id AND lr.record_type = 'efcc_conviction') as efcc_convictions,
  (SELECT COUNT(*) FROM projects pj WHERE pj.politician_id = p.id AND pj.status = 'completed') as projects_completed
FROM politicians p;
