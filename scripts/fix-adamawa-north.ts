/**
 * Fix Adamawa North Senator:
 * - Court sacked Ishaku Elisha Abbo in Oct 2023
 * - Amos Yohanna (PDP) sworn in as replacement on 16 Oct 2023
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
}

async function main() {
  const dryRun = !process.argv.includes('--import');
  if (dryRun) {
    console.log('[DRY RUN] Pass --import to apply changes\n');
  }

  // 1. Mark Ishaku Abbo's senate position as inactive
  console.log('1. Finding Ishaku Abbo senate position...');
  const { data: abboPos, error: abboPosErr } = await db
    .from('positions')
    .select('id, is_current, politician_id, politicians(full_name)')
    .eq('chamber', 'Senate')
    .eq('constituency', 'Adamawa North')
    .single();

  if (abboPosErr || !abboPos) {
    console.error('Could not find Adamawa North senate position:', abboPosErr);
    process.exit(1);
  }

  const pol = (Array.isArray(abboPos.politicians) ? abboPos.politicians[0] : abboPos.politicians) as { full_name: string } | null;
  console.log(`  Found: ${pol?.full_name} — is_current=${abboPos.is_current}`);

  if (!dryRun) {
    const { error } = await db
      .from('positions')
      .update({ is_current: false, end_date: '2023-10-16' })
      .eq('id', abboPos.id);
    if (error) {
      console.error('Failed to update Abbo position:', error);
      process.exit(1);
    }
    console.log('  ✓ Marked Abbo as is_current=false (end_date: 2023-10-16)');
  } else {
    console.log('  [DRY RUN] Would mark Abbo as is_current=false');
  }

  // 2. Upsert Amos Yohanna as a new politician
  console.log('\n2. Adding Amos Yohanna...');
  const yohannaData = {
    full_name: 'Amos Kumai Yohanna',
    slug: slugify('Amos Kumai Yohanna'),
    state_of_origin: 'Adamawa',
  };

  console.log(`  Slug: ${yohannaData.slug}`);

  let yohannaId: string;

  if (!dryRun) {
    const { data: upserted, error: upsertErr } = await db
      .from('politicians')
      .upsert(yohannaData, { onConflict: 'slug' })
      .select('id')
      .single();
    if (upsertErr || !upserted) {
      console.error('Failed to upsert Amos Yohanna:', upsertErr);
      process.exit(1);
    }
    yohannaId = upserted.id;
    console.log(`  ✓ Upserted Amos Yohanna (id: ${yohannaId})`);
  } else {
    console.log('  [DRY RUN] Would upsert Amos Yohanna');
    yohannaId = 'DRY-RUN-ID';
  }

  // 3. Check for existing senator position for Yohanna
  if (!dryRun) {
    const { data: existing } = await db
      .from('positions')
      .select('id')
      .eq('politician_id', yohannaId)
      .eq('chamber', 'Senate')
      .single();

    if (existing) {
      console.log('\n3. Amos Yohanna already has a Senate position — skipping insert.');
    } else {
      // Insert new senator position
      const posData = {
        politician_id: yohannaId,
        title: 'Senator',
        chamber: 'Senate',
        state: 'Adamawa',
        constituency: 'Adamawa North',
        party: 'PDP',
        start_date: '2023-10-16',
        end_date: '2027-06-12',
        is_current: true,
      };

      const { error: posErr } = await db.from('positions').insert(posData);
      if (posErr) {
        console.error('Failed to insert Yohanna position:', posErr);
        process.exit(1);
      }
      console.log('\n3. ✓ Inserted Senator position for Amos Yohanna (Adamawa North, PDP)');
    }
  } else {
    console.log('\n3. [DRY RUN] Would insert Senator position for Amos Yohanna (Adamawa North, PDP)');
  }

  // 4. Verify final count
  if (!dryRun) {
    const { data: counts } = await db
      .from('positions')
      .select('chamber, is_current')
      .eq('chamber', 'Senate');

    const total = counts?.length ?? 0;
    const current = counts?.filter(p => p.is_current).length ?? 0;
    console.log(`\nFinal Senate positions: total=${total}, current=${current}`);
    console.log('  (108 current = 109 districts - 1 vacant Edo Central seat)');
  }

  console.log('\nDone!');
}

main().catch(console.error);
