/**
 * NaijaRep — Missing Senators Seed Script
 * =========================================
 * Seeds the 35 senators not returned by the NASS DataTables API.
 * Data sourced from Wikipedia: 2023 Nigerian Senate election results.
 * These are all officially elected members of the 10th National Assembly.
 *
 * Usage:
 *   npx tsx scripts/seed-missing-senators.ts              # dry run — saves JSON only
 *   npx tsx scripts/seed-missing-senators.ts --import     # save JSON + upsert to Supabase
 *
 * Output: scripts/output/missing-senators.json
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const IMPORT_TO_DB = process.argv.includes('--import');
const OUTPUT_DIR   = path.join(process.cwd(), 'scripts', 'output');

// 10th National Assembly inauguration date
const TERM_START = '2023-06-13';
const TERM_END   = '2027-06-12';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SenatorRecord {
  full_name:    string;
  state:        string;
  constituency: string;
  party:        string;
  start_date:   string;
  end_date:     string;
  is_current:   boolean;
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

// ─── Missing Senators Data ────────────────────────────────────────────────────
// Source: https://en.wikipedia.org/wiki/2023_Nigerian_Senate_election
// These 35 senators are not in the NASS DataTables API (74 returned)
// but are officially elected members of the 10th National Assembly.
// Note: Monday Okpebholo (Edo Central) later became Edo Governor (Nov 2024),
// so his senate seat is now vacant — marked is_current: false.
const RAW_SENATORS: Omit<SenatorRecord, 'slug' | 'photo_url'>[] = [
  // Akwa Ibom
  { full_name: 'Ekong Sampson',                     state: 'Akwa Ibom',   constituency: 'Akwa Ibom South',   party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Anambra
  { full_name: 'Tony Nwoye',                        state: 'Anambra',     constituency: 'Anambra North',     party: 'LP',  start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Bayelsa
  { full_name: 'Kombowei Benson',                   state: 'Bayelsa',     constituency: 'Bayelsa Central',   party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Benue
  { full_name: 'Emmanuel Memga Udende',             state: 'Benue',       constituency: 'Benue North-East',  party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Titus Zam',                         state: 'Benue',       constituency: 'Benue North-West',  party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Cross River
  { full_name: 'Asuquo Ekpenyong',                  state: 'Cross River', constituency: 'Cross River South', party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Delta
  { full_name: 'Ede Dafinone',                      state: 'Delta',       constituency: 'Delta Central',     party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Joel Onowakpo Thomas',              state: 'Delta',       constituency: 'Delta South',       party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Ebonyi (all 3 missing)
  { full_name: 'Kenneth Eze',                       state: 'Ebonyi',      constituency: 'Ebonyi Central',    party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Onyekachi Nwaebonyi',               state: 'Ebonyi',      constituency: 'Ebonyi North',      party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Dave Umahi',                        state: 'Ebonyi',      constituency: 'Ebonyi South',      party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Edo (all 3 missing)
  { full_name: 'Monday Okpebholo',                  state: 'Edo',         constituency: 'Edo Central',       party: 'APC', start_date: TERM_START, end_date: '2024-11-12', is_current: false }, // became Edo Governor Nov 2024
  { full_name: 'Adams Oshiomhole',                  state: 'Edo',         constituency: 'Edo North',         party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Neda Imasuen',                      state: 'Edo',         constituency: 'Edo South',         party: 'LP',  start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Ekiti
  { full_name: 'Cyril Fasuyi',                      state: 'Ekiti',       constituency: 'Ekiti North',       party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Raphael Adeyemi Adaramodu',         state: 'Ekiti',       constituency: 'Ekiti South',       party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Enugu
  { full_name: 'Osita Ngwu',                        state: 'Enugu',       constituency: 'Enugu West',        party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Imo
  { full_name: 'Patrick Ndubueze',                  state: 'Imo',         constituency: 'Imo North',         party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Osita Izunaso',                     state: 'Imo',         constituency: 'Imo West',          party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Jigawa
  { full_name: 'Mustapha Khabeeb',                  state: 'Jigawa',      constituency: 'Jigawa South-West', party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Kaduna
  { full_name: 'Khalid Mustapha',                   state: 'Kaduna',      constituency: 'Kaduna North',      party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Kano
  { full_name: 'Rufai Sani Hanga',                  state: 'Kano',        constituency: 'Kano Central',      party: 'NNPP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Suleiman Kawu Sumaila',             state: 'Kano',        constituency: 'Kano South',        party: 'NNPP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Katsina
  { full_name: 'Abdulaziz Musa Yardua',             state: 'Katsina',     constituency: 'Katsina Central',   party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Mohammed Muntari Dandutse',         state: 'Katsina',     constituency: 'Katsina South',     party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Kebbi
  { full_name: 'Garba Musa Maidoki',                state: 'Kebbi',       constituency: 'Kebbi South',       party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Kwara
  { full_name: 'Saliu Mustapha',                    state: 'Kwara',       constituency: 'Kwara Central',     party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Lagos
  { full_name: 'Oluranti Adebule',                  state: 'Lagos',       constituency: 'Lagos West',        party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Oyo
  { full_name: 'Yunus Akintunde',                   state: 'Oyo',         constituency: 'Oyo Central',       party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Sharafadeen Alli',                  state: 'Oyo',         constituency: 'Oyo South',         party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Plateau
  { full_name: 'Diket Plang',                       state: 'Plateau',     constituency: 'Plateau Central',   party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Napoleon Bali',                     state: 'Plateau',     constituency: 'Plateau South',     party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Rivers
  { full_name: 'Ipalibo Banigo',                    state: 'Rivers',      constituency: 'Rivers West',       party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  // Sokoto
  { full_name: 'Ibrahim Lamido',                    state: 'Sokoto',      constituency: 'Sokoto East',       party: 'APC', start_date: TERM_START, end_date: TERM_END, is_current: true  },
  { full_name: 'Aminu Waziri Tambuwal',             state: 'Sokoto',      constituency: 'Sokoto South',      party: 'PDP', start_date: TERM_START, end_date: TERM_END, is_current: true  },
];

const SENATORS: SenatorRecord[] = RAW_SENATORS.map(s => ({
  ...s,
  slug:      toSlug(s.full_name),
  photo_url: null,
}));

// ─── Supabase Import ──────────────────────────────────────────────────────────
async function importToSupabase(senators: SenatorRecord[]): Promise<void> {
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
  console.log(`\n📥 Importing ${senators.length} senators to Supabase…\n`);

  let added = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  for (const s of senators) {
    // Upsert politician row (conflict on slug)
    const { data: pol, error: polErr } = await db
      .from('politicians')
      .upsert(
        {
          full_name:       s.full_name,
          slug:            s.slug,
          photo_url:       s.photo_url,
          state_of_origin: s.state,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    if (polErr || !pol) {
      console.error(`  ✗ ${s.full_name}: ${polErr?.message}`);
      errors.push(`${s.full_name}: ${polErr?.message}`);
      skipped++;
      continue;
    }

    // Check if senator position for this constituency already exists
    const { data: existing } = await db
      .from('positions')
      .select('id')
      .eq('politician_id', pol.id)
      .eq('title', 'Senator')
      .eq('constituency', s.constituency)
      .single();

    const posData = {
      politician_id: pol.id,
      title:         'Senator',
      chamber:       'Senate',
      constituency:  s.constituency,
      state:         s.state,
      party:         s.party,
      start_date:    s.start_date,
      end_date:      s.end_date,
      is_current:    s.is_current,
    };

    if (existing) {
      const { error: updErr } = await db
        .from('positions')
        .update(posData)
        .eq('id', existing.id);
      if (updErr) {
        console.error(`  ✗ position update ${s.full_name}: ${updErr.message}`);
        errors.push(`position ${s.full_name}: ${updErr.message}`);
        skipped++;
        continue;
      }
      updated++;
    } else {
      const { error: insErr } = await db
        .from('positions')
        .insert(posData);
      if (insErr) {
        console.error(`  ✗ position insert ${s.full_name}: ${insErr.message}`);
        errors.push(`position ${s.full_name}: ${insErr.message}`);
        skipped++;
        continue;
      }
      added++;
    }

    const status = s.is_current ? '✓' : '⏸';
    console.log(`  ${status} [${String(added + updated).padStart(2)}] ${s.full_name.padEnd(32)} (${s.constituency}, ${s.party})`);
  }

  console.log(`\n  ✓ Done — new: ${added}, updated: ${updated}, skipped: ${skipped}`);

  if (errors.length) {
    const errFile = path.join(OUTPUT_DIR, 'missing-senators-errors.json');
    fs.writeFileSync(errFile, JSON.stringify(errors, null, 2));
    console.warn(`  ⚠  ${errors.length} error(s) → ${errFile}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🇳🇬  NaijaRep — Missing Senators Seed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total to seed:  ${SENATORS.length} senators`);
  console.log(`  Source:         Wikipedia 2023 Senate election`);
  console.log(`  Import to DB:   ${IMPORT_TO_DB}`);
  console.log('');

  // Print by state
  const byState: Record<string, string[]> = {};
  for (const s of SENATORS) {
    (byState[s.state] ??= []).push(`${s.constituency} → ${s.full_name} (${s.party})`);
  }
  for (const [state, members] of Object.entries(byState).sort()) {
    console.log(`  🏛️  ${state}:`);
    for (const m of members) console.log(`       ${m}`);
  }
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Save JSON
  const outFile = path.join(OUTPUT_DIR, 'missing-senators.json');
  fs.writeFileSync(outFile, JSON.stringify(SENATORS, null, 2));
  console.log(`  💾 Saved → ${outFile}`);

  if (IMPORT_TO_DB) {
    await importToSupabase(SENATORS);
  } else {
    console.log('\n  💡 Run with --import to upsert into Supabase:');
    console.log('     npx tsx scripts/seed-missing-senators.ts --import\n');
  }

  console.log('\n✅ Done!\n');
}

main().catch(e => { console.error('\n✗ Fatal:', e); process.exit(1); });
