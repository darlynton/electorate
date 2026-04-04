/**
 * Applies all pending migrations to Supabase in order.
 *
 * Requires SUPABASE_ACCESS_TOKEN in .env.local
 * Get one at: https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   npx tsx scripts/apply-schema.ts          # apply all migrations
 *   npx tsx scripts/apply-schema.ts 003      # apply only 003_*.sql
 */
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

async function runSql(ref: string, accessToken: string, sql: string, label: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (res.ok) {
    console.log(`   ✅ ${label}`);
    return;
  }

  const body = await res.text().catch(() => '');
  console.error(`   ✗ ${label} — API returned ${res.status}: ${body.slice(0, 400)}`);
  throw new Error(`Migration failed: ${label}`);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl) {
    console.error('✗ NEXT_PUBLIC_SUPABASE_URL missing from .env.local');
    process.exit(1);
  }

  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) {
    console.error('✗ Could not parse project ref from URL:', supabaseUrl);
    process.exit(1);
  }

  if (!accessToken) {
    console.error('✗ SUPABASE_ACCESS_TOKEN missing from .env.local');
    console.error('');
    console.error('  Get one here (takes ~30 seconds):');
    console.error('  https://supabase.com/dashboard/account/tokens');
    console.error('');
    console.error('  Then add this to your .env.local:');
    console.error('  SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx');
    process.exit(1);
  }

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const onlyPrefix = process.argv[2]; // e.g. "003" to run only 003_*.sql

  // Read all .sql files, sorted by filename
  const allFiles = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const files = onlyPrefix
    ? allFiles.filter(f => f.startsWith(onlyPrefix))
    : allFiles;

  if (files.length === 0) {
    console.error(`✗ No migration files found${onlyPrefix ? ` matching "${onlyPrefix}"` : ''}`);
    process.exit(1);
  }

  console.log(`\n📦 Applying ${files.length} migration(s) to project: ${ref}\n`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await runSql(ref, accessToken, sql, file);
  }

  console.log('\n✅ All migrations applied successfully!');
  console.log('');
  console.log('   Next steps:');
  console.log('   1. npx tsx scripts/scrape-nass.ts --from-json --import   (if not done)');
  console.log('   2. npx tsx scripts/seed-constituency-map.ts              (populate LGA→constituency map)');
}

main().catch(e => { console.error('✗ Fatal:', e.message); process.exit(1); });
