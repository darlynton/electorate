// Apply migration 007 directly via Supabase REST API
// Run with: npx tsx scripts/apply-migration-007.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const sql = `
-- Create politician_ratings table if not exists
CREATE TABLE IF NOT EXISTS politician_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
  rating_period TEXT NOT NULL,
  constituency_presence SMALLINT CHECK (constituency_presence BETWEEN 1 AND 5),
  legislative_activity  SMALLINT CHECK (legislative_activity  BETWEEN 1 AND 5),
  constituency_projects SMALLINT CHECK (constituency_projects BETWEEN 1 AND 5),
  accessibility         SMALLINT CHECK (accessibility         BETWEEN 1 AND 5),
  transparency          SMALLINT CHECK (transparency          BETWEEN 1 AND 5),
  infrastructure              SMALLINT CHECK (infrastructure              BETWEEN 1 AND 5),
  security                    SMALLINT CHECK (security                    BETWEEN 1 AND 5),
  healthcare_education        SMALLINT CHECK (healthcare_education        BETWEEN 1 AND 5),
  economic_activity           SMALLINT CHECK (economic_activity           BETWEEN 1 AND 5),
  transparency_communication  SMALLINT CHECK (transparency_communication  BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_politician_period UNIQUE(user_id, politician_id, rating_period)
);

-- Indexes (IF NOT EXISTS requires Postgres 9.5+)
CREATE INDEX IF NOT EXISTS idx_politician_ratings_politician ON politician_ratings(politician_id);
CREATE INDEX IF NOT EXISTS idx_politician_ratings_user       ON politician_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_politician_ratings_period     ON politician_ratings(rating_period);

-- RLS
ALTER TABLE politician_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'politician_ratings' AND policyname = 'Anyone can read ratings'
  ) THEN
    CREATE POLICY "Anyone can read ratings"
      ON politician_ratings FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'politician_ratings' AND policyname = 'Users can insert own ratings'
  ) THEN
    CREATE POLICY "Users can insert own ratings"
      ON politician_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'politician_ratings' AND policyname = 'Users can update own ratings'
  ) THEN
    CREATE POLICY "Users can update own ratings"
      ON politician_ratings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
`;

async function run() {
  const projectRef = SUPABASE_URL!.match(/https:\/\/([^.]+)\./)?.[1];
  if (!projectRef) {
    console.error('Could not parse project ref from URL');
    process.exit(1);
  }

  console.log(`Applying migration to project: ${projectRef}`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ Failed (${res.status}):`, body);
    process.exit(1);
  }

  const data = await res.json();
  console.log('✅ Migration applied successfully');
  console.log(JSON.stringify(data, null, 2));
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
