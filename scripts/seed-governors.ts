/**
 * NaijaRep — Governors Seed Script
 * ===================================
 * Seeds all 36 current Nigerian state governors into Supabase.
 * Data sourced from Wikipedia (current as of March 2026).
 *
 * Usage:
 *   npx tsx scripts/seed-governors.ts              # dry run — saves JSON only
 *   npx tsx scripts/seed-governors.ts --import     # save JSON + upsert to Supabase
 *
 * Output: scripts/output/governors.json
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const IMPORT_TO_DB = process.argv.includes('--import');
const OUTPUT_DIR   = path.join(process.cwd(), 'scripts', 'output');

// ─── Types ────────────────────────────────────────────────────────────────────
interface GovernorRecord {
  full_name:    string;
  state:        string;
  party:        string;
  start_date:   string;   // YYYY-MM-DD
  term_end:     string;   // YYYY-MM-DD
  slug:         string;
  photo_url:    null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Governors data ───────────────────────────────────────────────────────────
// Source: https://en.wikipedia.org/wiki/List_of_current_state_governors_in_Nigeria
// Verified March 2026
const RAW_GOVERNORS: Omit<GovernorRecord, 'slug' | 'photo_url'>[] = [
  { full_name: 'Alex Otti',               state: 'Abia',        party: 'LP',    start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Ahmadu Umaru Fintiri',    state: 'Adamawa',     party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Umo Eno',                 state: 'Akwa Ibom',   party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Charles Soludo',          state: 'Anambra',     party: 'APGA',  start_date: '2022-03-17', term_end: '2026-03-17' },
  { full_name: 'Bala Muhammed',           state: 'Bauchi',      party: 'PDP',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Douye Diri',              state: 'Bayelsa',     party: 'APC',   start_date: '2020-02-14', term_end: '2028-02-14' },
  { full_name: 'Hyacinth Alia',           state: 'Benue',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Babagana Zulum',          state: 'Borno',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Bassey Otu',              state: 'Cross River', party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Sheriff Oborevwori',      state: 'Delta',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Francis Nwifuru',         state: 'Ebonyi',      party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Monday Okpebholo',        state: 'Edo',         party: 'APC',   start_date: '2024-11-12', term_end: '2028-11-12' },
  { full_name: 'Biodun Oyebanji',         state: 'Ekiti',       party: 'APC',   start_date: '2022-10-16', term_end: '2026-10-16' },
  { full_name: 'Peter Mbah',              state: 'Enugu',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Muhammad Inuwa Yahaya',   state: 'Gombe',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Hope Uzodinma',           state: 'Imo',         party: 'APC',   start_date: '2020-01-14', term_end: '2028-01-14' },
  { full_name: 'Umar Namadi',             state: 'Jigawa',      party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Uba Sani',                state: 'Kaduna',      party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Abba Kabir Yusuf',        state: 'Kano',        party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Dikko Umaru Radda',       state: 'Katsina',     party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Nasir Idris',             state: 'Kebbi',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Ahmed Usman Ododo',       state: 'Kogi',        party: 'APC',   start_date: '2024-01-27', term_end: '2028-01-27' },
  { full_name: 'AbdulRahman AbdulRazaq',  state: 'Kwara',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Babajide Sanwo-Olu',      state: 'Lagos',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Abdullahi Sule',          state: 'Nasarawa',    party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Mohammed Umar Bago',      state: 'Niger',       party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Dapo Abiodun',            state: 'Ogun',        party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Lucky Aiyedatiwa',        state: 'Ondo',        party: 'APC',   start_date: '2023-12-27', term_end: '2029-02-24' },
  { full_name: 'Ademola Adeleke',         state: 'Osun',        party: 'PDP',   start_date: '2022-11-27', term_end: '2026-11-27' },
  { full_name: 'Seyi Makinde',            state: 'Oyo',         party: 'PDP',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Caleb Mutfwang',          state: 'Plateau',     party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Siminalayi Fubara',       state: 'Rivers',      party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Ahmad Aliyu',             state: 'Sokoto',      party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Agbu Kefas',              state: 'Taraba',      party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Mai Mala Buni',           state: 'Yobe',        party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
  { full_name: 'Dauda Lawal',             state: 'Zamfara',     party: 'APC',   start_date: '2023-05-29', term_end: '2027-05-29' },
];

const GOVERNORS: GovernorRecord[] = RAW_GOVERNORS.map(g => ({
  ...g,
  slug:      toSlug(g.full_name),
  photo_url: null,
}));

// ─── Supabase Import ──────────────────────────────────────────────────────────
async function importToSupabase(governors: GovernorRecord[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('your-project')) {
    console.error('\n✗ Set NEXT_PUBLIC_SUPABASE_URL in .env.local first');
    return;
  }
  if (!key || key.includes('your-service')) {
    console.error('\n✗ Set SUPABASE_SERVICE_ROLE_KEY in .env.local first');
    return;
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  console.log(`\n📥 Importing ${governors.length} governors to Supabase…\n`);

  let added = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  for (const g of governors) {
    // Upsert politician row
    const { data: pol, error: polErr } = await db
      .from('politicians')
      .upsert(
        {
          full_name:       g.full_name,
          slug:            g.slug,
          photo_url:       g.photo_url,
          state_of_origin: g.state,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    if (polErr || !pol) {
      console.error(`  ✗ ${g.full_name}: ${polErr?.message}`);
      errors.push(`${g.full_name}: ${polErr?.message}`);
      skipped++;
      continue;
    }

    // Check if governor position already exists
    const { data: existing } = await db
      .from('positions')
      .select('id')
      .eq('politician_id', pol.id)
      .eq('title', 'Governor')
      .single();

    const posData = {
      politician_id: pol.id,
      title:         'Governor',
      chamber:       'Executive',
      constituency:  `${g.state} State`,
      state:         g.state,
      party:         g.party,
      start_date:    g.start_date,
      end_date:      g.term_end,
      is_current:    true,
    };

    if (existing) {
      const { error: updErr } = await db
        .from('positions')
        .update(posData)
        .eq('id', existing.id);
      if (updErr) {
        console.error(`  ✗ position update ${g.full_name}: ${updErr.message}`);
        errors.push(`position ${g.full_name}: ${updErr.message}`);
        skipped++;
        continue;
      }
      updated++;
    } else {
      const { error: insErr } = await db
        .from('positions')
        .insert(posData);
      if (insErr) {
        console.error(`  ✗ position insert ${g.full_name}: ${insErr.message}`);
        errors.push(`position ${g.full_name}: ${insErr.message}`);
        skipped++;
        continue;
      }
      added++;
    }

    console.log(`  ✓ [${String(added + updated).padStart(2)}] ${g.full_name.padEnd(30)} (${g.state}, ${g.party})`);
  }

  console.log(`\n  ✓ Done — new: ${added}, updated: ${updated}, skipped: ${skipped}`);

  if (errors.length) {
    const errFile = path.join(OUTPUT_DIR, 'governors-import-errors.json');
    fs.writeFileSync(errFile, JSON.stringify(errors, null, 2));
    console.warn(`  ⚠  ${errors.length} error(s) → ${errFile}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🇳🇬  NaijaRep — Governors Seed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total governors: ${GOVERNORS.length}`);
  console.log(`  Import to DB:    ${IMPORT_TO_DB}`);
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Save JSON
  const outFile = path.join(OUTPUT_DIR, 'governors.json');
  fs.writeFileSync(outFile, JSON.stringify(GOVERNORS, null, 2));
  console.log(`  💾 Saved → ${outFile}`);

  // Print summary by party
  const byParty = GOVERNORS.reduce((acc, g) => {
    acc[g.party] = (acc[g.party] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('  🏛️  By party:', Object.entries(byParty).map(([p, n]) => `${p}:${n}`).join('  '));

  if (IMPORT_TO_DB) {
    await importToSupabase(GOVERNORS);
  } else {
    console.log('\n  💡 Run with --import to upsert into Supabase:');
    console.log('     npx tsx scripts/seed-governors.ts --import\n');
  }

  console.log('\n✅ Done!\n');
}

main().catch(e => { console.error('\n✗ Fatal:', e); process.exit(1); });
