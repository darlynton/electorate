import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';

config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const sql = fs.readFileSync('supabase/migrations/005_contact_details_and_edit_suggestions.sql', 'utf-8');
  
  // Split on semicolons, filter out comments/empty
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.startsWith('--'));

  let ok = 0, fail = 0;
  for (const stmt of statements) {
    const fullStmt = stmt + ';';
    const { error } = await db.rpc('exec_sql', { sql_text: fullStmt });
    if (error) {
      console.error('FAIL:', stmt.slice(0, 80), '...', error.message);
      fail++;
    } else {
      ok++;
    }
  }
  console.log(`Done: ${ok} ok, ${fail} failed`);
}

main().catch(console.error);
