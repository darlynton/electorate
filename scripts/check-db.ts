import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db  = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await db.from('politicians').select('id').limit(1);
  if (error) {
    console.log('STATUS: Schema not found or connection failed');
    console.log('ERROR:', error.message);
  } else {
    const { count } = await db.from('politicians').select('*', { count: 'exact', head: true });
    console.log('STATUS: Connected OK — politicians table exists');
    console.log('ROWS:', count ?? 0);
  }
}
main();
