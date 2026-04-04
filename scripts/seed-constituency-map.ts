/**
 * seed-constituency-map.ts
 *
 * Populates constituency_lga_map by:
 *  1. Loading every INEC LGA from the nigerian-states-lgas-and-polling-units package
 *  2. Loading senators & house reps from the DATABASE (not JSON files) — so all
 *     data added by scrape, Wikipedia import, or fix scripts is used.
 *  3. Matching LGA → federal constituency (house rep) via fuzzy name matching
 *  4. Matching LGA → senatorial district via name heuristics + round-robin fallback
 *  5. Upserting to constituency_lga_map
 *
 * Run: npx tsx scripts/seed-constituency-map.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  getStates,
  getLGAsByState,
} from 'nigerian-states-lgas-and-polling-units';

config({ path: '.env.local' });

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ─── Name normalisation helpers ───────────────────────────────────────────────
const norm = (s: string) =>
  s.toUpperCase().replace(/[-\/]/g, ' ').replace(/\s+/g, ' ').trim();

function expandConstituency(raw: string): string[] {
  let s = raw.replace(/\s*federal constituency\s*/gi, '').trim();
  s = s.replace(/\s+[IVX\d]+\s*$/, '').trim();
  s = s.replace(/\s*(local\s+govt\.?|lga|metropolitan)\s*$/gi, '').trim();
  s = s.replace(/\s*\(.*?\)\s*/g, '').trim();

  const parts = s.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length === 1) return [norm(parts[0])];

  const DIRECTIONALS = new Set([
    'NORTH','SOUTH','EAST','WEST','CENTRAL',
    'NORTH EAST','NORTH WEST','SOUTH EAST','SOUTH WEST',
  ]);
  const firstWords = norm(parts[0]).split(' ');
  const prefix = firstWords.length > 1 ? firstWords.slice(0, -1).join(' ') : null;

  return parts.map(p => {
    const up = norm(p);
    if (prefix && DIRECTIONALS.has(up)) return `${prefix} ${up}`;
    return up;
  });
}

function lgaMatchesTokens(lgaName: string, tokens: string[]): boolean {
  const lg = applyAlias(norm(lgaName));
  for (const t of tokens) {
    if (lg === t) return true;
    if (lg.includes(t) || t.includes(lg)) return true;
    const lgWords = lg.split(' ');
    const tWords  = t.split(' ');
    const shared  = lgWords.filter(w => w.length > 3 && tWords.includes(w));
    if (shared.length > 0 && shared.length >= Math.min(lgWords.length, tWords.length)) return true;
  }
  return false;
}

// ─── LGA name alias map ───────────────────────────────────────────────────────
const LGA_ALIAS: Record<string, string> = {
  'EGBADO NORTH': 'YEWA NORTH',
  'EGBADO SOUTH': 'YEWA SOUTH',
  'MALAM MADORI': 'MALLAM MADORI',
  'OGUN WATER SIDE': 'OGUN WATERSIDE',
  'OGORI MANGOGO': 'OGORI MAGOGO',
  'MOPA MORO':     'MOPA MURO',
  'KOTON KARFE':   'LOKOJA',
  'ABAJI':         'ABUJA MUNICIPAL',
  'IHALA':         'IHIALA',
};

function applyAlias(lgaNorm: string): string {
  return LGA_ALIAS[lgaNorm] ?? lgaNorm;
}

const STATE_ALIAS: Record<string, string> = {
  'FCT':        'ABUJA FCT',
  'NASSARAWA':  'NASARAWA',
  'NASSARRAWA': 'NASARAWA',
};

function normaliseStateName(nassState: string): string {
  const up = norm(nassState);
  return STATE_ALIAS[up] ?? up;
}

// ─── Load data from database ─────────────────────────────────────────────────
interface PositionRow {
  chamber: string;
  constituency: string;
  state: string;
  party: string;
  politicians: { slug: string; full_name: string } | null;
}

async function loadFromDB() {
  const { data, error } = await db
    .from('positions')
    .select('chamber, constituency, state, party, politicians(slug, full_name)')
    .eq('is_current', true)
    .in('chamber', ['Senate', 'House']);

  if (error) throw new Error(`DB query failed: ${error.message}`);
  return (data ?? []) as unknown as PositionRow[];
}

// ─── Senate: senatorial district assignment ─────────────────────────────────
interface SenDistrict {
  district: string;
  slug: string;
  state: string;
}

// Manual overrides for LGAs that the heuristic assigns to the wrong senatorial
// district. Key = "STATE|LGA", value = direction keyword in the district name.
const SENATORIAL_OVERRIDES: Record<string, string> = {
  'ANAMBRA|IDEMILI NORTH': 'CENTRAL',
  'ANAMBRA|IDEMILI SOUTH': 'CENTRAL',
};

function assignSenatorToLga(
  lgaName: string,
  districts: SenDistrict[],
  lgaIndex: number,
  totalLgas: number,
  stateName?: string,
): SenDistrict {
  const lg = norm(lgaName);

  // 0. Check manual overrides first
  if (stateName) {
    const overrideKey = `${norm(stateName)}|${lg}`;
    const overrideDir = SENATORIAL_OVERRIDES[overrideKey];
    if (overrideDir) {
      const match = districts.find(d => norm(d.district).includes(norm(overrideDir)));
      if (match) return match;
    }
  }

  // 1. Direct name containment — try to match district direction with LGA direction
  for (const d of districts) {
    const dn = norm(d.district);
    // Extract direction from district name (e.g. "ANAMBRA NORTH" → "NORTH")
    const stateNorm = normaliseStateName(d.state.replace('ABUJA FCT', 'FCT'));
    const direction = dn.replace(stateNorm, '').replace(norm(d.state), '').trim();
    
    // Check if the LGA name contains the district state+direction
    if (direction && lg.includes(direction)) return d;
    // Check if district contains the full LGA name
    if (dn.includes(lg)) return d;
  }

  // 2. Round-robin by index position (roughly geographic since LGAs are
  //    typically alphabetical within a state in the INEC package)
  const bucket = Math.floor((lgaIndex / totalLgas) * districts.length);
  return districts[Math.min(bucket, districts.length - 1)];
}

// ─── House rep: constituency matching ────────────────────────────────────────
interface HouseConstit {
  constituency: string;
  slug: string;
  tokens: string[];
  state: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🗺️  Building constituency ↔ LGA mapping...');
  console.log('   (Loading politician data from DATABASE)\n');

  // ── Load from DB ──
  const positions = await loadFromDB();
  console.log(`  📊 Loaded ${positions.length} current positions from DB`);

  // Separate into Senate and House
  const senDistrictsByState: Record<string, SenDistrict[]> = {};
  const houseByState: Record<string, HouseConstit[]> = {};

  for (const p of positions) {
    if (!p.constituency || !p.state) continue;
    const pol = p.politicians as unknown as { slug: string; full_name: string } | null;
    if (!pol) continue;

    const stateKey = normaliseStateName(p.state);

    if (p.chamber === 'Senate') {
      if (!senDistrictsByState[stateKey]) senDistrictsByState[stateKey] = [];
      // Avoid duplicates
      if (!senDistrictsByState[stateKey].some(d => d.district === p.constituency)) {
        senDistrictsByState[stateKey].push({
          district: p.constituency,
          slug: pol.slug,
          state: stateKey,
        });
      }
    } else if (p.chamber === 'House') {
      if (!houseByState[stateKey]) houseByState[stateKey] = [];
      if (!houseByState[stateKey].some(h => h.constituency === p.constituency)) {
        houseByState[stateKey].push({
          constituency: p.constituency,
          slug: pol.slug,
          tokens: expandConstituency(p.constituency),
          state: stateKey,
        });
      }
    }
  }

  // Log state coverage
  const statesSen = Object.keys(senDistrictsByState);
  const statesHouse = Object.keys(houseByState);
  console.log(`  🏛️  Senate data: ${statesSen.length} states, ${Object.values(senDistrictsByState).flat().length} districts`);
  console.log(`  🏠 House data:  ${statesHouse.length} states, ${Object.values(houseByState).flat().length} constituencies\n`);

  // ── Build LGA mapping ──
  const rows: Record<string, unknown>[] = [];
  const allStates = getStates();

  for (const state of allStates) {
    const stateKey  = norm(state.name);
    const lgas      = getLGAsByState(state.id);
    const hConstits = houseByState[stateKey] ?? [];
    const sDistricts = senDistrictsByState[stateKey] ?? [];

    if (hConstits.length === 0) {
      console.warn(`  ⚠️  No house reps for state: ${stateKey}`);
    }
    if (sDistricts.length === 0) {
      console.warn(`  ⚠️  No senators for state: ${stateKey}`);
    } else if (sDistricts.length < 3 && stateKey !== 'ABUJA FCT') {
      console.warn(`  ⚠️  Only ${sDistricts.length}/3 senators for ${stateKey}: ${sDistricts.map(d=>d.district).join(', ')}`);
    }

    lgas.forEach((lga, lgaIdx) => {
      const hMatch = hConstits.find(h => lgaMatchesTokens(lga.name, h.tokens));
      const sMatch = sDistricts.length
        ? assignSenatorToLga(lga.name, sDistricts, lgaIdx, lgas.length, stateKey)
        : null;

      rows.push({
        inec_state_id:        state.id,
        inec_lga_id:          lga.id,
        state_name:           stateKey,
        lga_name:             norm(lga.name),
        federal_constituency: hMatch?.constituency ?? `${stateKey} (unmapped)`,
        senatorial_district:  sMatch?.district     ?? `${stateKey} (unmapped)`,
        house_rep_slug:       hMatch?.slug          ?? null,
        senator_slug:         sMatch?.slug          ?? null,
      });
    });
  }

  console.log(`\n📊 Total LGA rows to upsert: ${rows.length}`);

  // ── Upsert in batches of 100 ──
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db
      .from('constituency_lga_map')
      .upsert(batch, { onConflict: 'inec_lga_id' });

    if (error) {
      console.error(`  ✗ Batch ${i}–${i + BATCH} failed:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  ✓ ${inserted}/${rows.length} rows upserted`);
    }
  }
  console.log('\n');

  // ── Summary ──
  const unmatched = rows.filter(r => !r.house_rep_slug);
  const unmatchedSen = rows.filter(r => !r.senator_slug);
  console.log(`✅ Done!`);
  console.log(`   House rep matched: ${rows.length - unmatched.length}/${rows.length} LGAs`);
  console.log(`   Senator matched:   ${rows.length - unmatchedSen.length}/${rows.length} LGAs`);

  // Show per-state stats for debugging
  const stateStats = new Map<string, { total: number; houseMatched: number; senMatched: number; senDistricts: number }>();
  for (const r of rows) {
    const st = r.state_name as string;
    if (!stateStats.has(st)) stateStats.set(st, { total: 0, houseMatched: 0, senMatched: 0, senDistricts: 0 });
    const s = stateStats.get(st)!;
    s.total++;
    if (r.house_rep_slug) s.houseMatched++;
    if (r.senator_slug) s.senMatched++;
  }
  // Count distinct senatorial districts per state
  for (const r of rows) {
    const st = r.state_name as string;
    // Already counted above
  }

  // Show states with missing data
  const issues: string[] = [];
  for (const [st, s] of stateStats) {
    const senDists = new Set(rows.filter(r => r.state_name === st).map(r => r.senatorial_district as string).filter(d => !d.includes('unmapped')));
    if (senDists.size < 3 && st !== 'ABUJA FCT') {
      issues.push(`   ${st}: ${senDists.size} senatorial districts, ${s.houseMatched}/${s.total} house rep matches`);
    }
  }
  if (issues.length) {
    console.log(`\n⚠️  States with incomplete senatorial coverage (< 3 districts):`);
    issues.forEach(i => console.log(i));
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
