/**
 * NaijaRep — NASS Member Scraper
 * ================================
 * Scrapes the National Assembly website (nass.gov.ng) via its internal
 * DataTables AJAX endpoint to get all senators and House of Reps members,
 * with optional per-profile fetching and Supabase import.
 *
 * Usage:
 *   npx tsx scripts/scrape-nass.ts                             # scrape all, save JSON
 *   npx tsx scripts/scrape-nass.ts --chamber=senate            # senators only
 *   npx tsx scripts/scrape-nass.ts --chamber=house             # house reps only
 *   npx tsx scripts/scrape-nass.ts --limit=10                  # test first 10
 *   npx tsx scripts/scrape-nass.ts --profiles                  # also fetch DOB/email per member
 *   npx tsx scripts/scrape-nass.ts --import                    # scrape + import to Supabase
 *   npx tsx scripts/scrape-nass.ts --from-json --import        # import from existing JSON
 *
 * Output files (scripts/output/):
 *   senators.json, house_reps.json, all_members.json, scrape-log.json
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

// ─── CLI Flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt  = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];

const IMPORT_TO_DB   = flag('import');
const FROM_JSON      = flag('from-json');
const FETCH_PROFILES = flag('profiles');
const CHAMBER_ARG    = (opt('chamber') ?? 'all') as 'senate' | 'house' | 'all';
const LIMIT          = parseInt(opt('limit') ?? 'Infinity');

// ─── Constants ────────────────────────────────────────────────────────────────
const NASS_BASE  = 'https://nass.gov.ng';
const PHOTO_BASE = `${NASS_BASE}/themes/newnass/images/mps`;
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const DELAY_MS   = 1200;

// NASS DataTables API chamber IDs
const CHAMBER_NUM = { Senate: '1', House: '2' } as const;

// 10th National Assembly (started June 2023)
const ASSEMBLY_NUMBER = 10;
const ASSEMBLY_START  = '2023-06-13';

const HEADERS = {
  'User-Agent': 'NaijaRep/1.0 (civic-tech research; naijarep.ng)',
  Accept:       'application/json, text/html, */*',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ListEntry {
  nass_id:      number;
  full_name:    string;
  state:        string;
  constituency: string;
  party:        string;
}

interface ProfileData {
  title:          string;
  date_of_birth?: string;
  email?:         string;
  twitter?:       string;
}

export interface NASSMember extends ListEntry {
  slug:           string;
  chamber:        'Senate' | 'House';
  title:          string;
  photo_url:      string;
  nass_url:       string;
  date_of_birth?: string;
  email?:         string;
  twitter?:       string;
  scraped_at:     string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(sen\.|hon\.)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function uniqueSlug(slug: string, seen: Set<string>): string {
  let s = slug, n = 2;
  while (seen.has(s)) s = `${slug}-${n++}`;
  seen.add(s);
  return s;
}

function titleCase(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normalizeState(s: string): string {
  const lc = s.trim().toLowerCase();
  if (lc === 'fct' || lc === 'federal capital territory') return 'FCT';
  return s.trim().replace(/\b\w/g, c => c.toUpperCase());
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function httpGet(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal:  AbortSignal.timeout(20_000),
      });
      if (res.status === 429) { await sleep(10_000); continue; }
      if (!res.ok) { console.warn(`  ⚠ HTTP ${res.status}: ${url}`); return null; }
      return await res.text();
    } catch {
      if (attempt < 2) await sleep(3_000);
    }
  }
  console.warn(`  ⚠ Failed after 3 attempts: ${url}`);
  return null;
}

// ─── Step 1: Fetch member list from AJAX API ──────────────────────────────────
async function fetchMemberList(chamber: 'Senate' | 'House'): Promise<ListEntry[]> {
  const url = `${NASS_BASE}/mps/get_legislators/?chamber=${CHAMBER_NUM[chamber]}`;
  console.log(`\n📡 Fetching ${chamber} from API…`);

  const text = await httpGet(url);
  if (!text) return [];

  let json: { recordsTotal: number; data: string[][] };
  try {
    json = JSON.parse(text);
  } catch {
    console.error('  ✗ Invalid JSON response');
    return [];
  }

  const members: ListEntry[] = json.data.map(row => ({
    nass_id:      parseInt(row[4]),
    full_name:    titleCase(row[0]),
    state:        normalizeState(row[1]),
    constituency: row[2]?.trim() ?? '',
    party:        row[3]?.trim().toUpperCase() ?? '',
  }));

  console.log(`  ✓ API: ${members.length} members (total seats: ${json.recordsTotal})`);

  // Also grab leadership from the HTML page — they're in cards, not the DataTable
  const leaders = await scrapeLeadershipCards(chamber, new Set(members.map(m => m.nass_id)));
  if (leaders.length > 0) {
    console.log(`  + ${leaders.length} leadership members added from HTML page`);
    members.push(...leaders);
  }

  return members;
}

// ─── Step 1b: Scrape leadership cards from HTML ───────────────────────────────
async function scrapeLeadershipCards(
  chamber: 'Senate' | 'House',
  existingIds: Set<number>
): Promise<ListEntry[]> {
  const url  = chamber === 'Senate' ? `${NASS_BASE}/mps/senators` : `${NASS_BASE}/mps/members`;
  const html = await httpGet(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const leaders: ListEntry[] = [];

  $('h4 a[href*="/mps/single/"], h3 a[href*="/mps/single/"]').each((_, el) => {
    const href    = $(el).attr('href') ?? '';
    const rawName = $(el).text().replace(/^(SEN\.|HON\.)\s+/i, '').trim();
    const match   = href.match(/\/mps\/single\/(\d+)/);
    if (!match || !rawName || rawName.length < 4) return;

    const id = parseInt(match[1]);
    if (existingIds.has(id)) return; // already in API data

    // Try to find the constituency from card text
    const card = $(el).closest('div');
    const lines = card.text()
      .split(/\n+/)
      .map(l => l.trim())
      .filter(l => l.length > 2 && !l.match(/^(sen\.|hon\.)/i) && !l.includes(rawName));
    const constituency = lines.at(0) ?? '';

    leaders.push({
      nass_id:      id,
      full_name:    titleCase(rawName),
      state:        '',
      constituency: constituency.length < 60 ? constituency : '',
      party:        '',
    });
    existingIds.add(id);
  });

  return leaders;
}

// ─── Step 2: Fetch individual profile (optional) ──────────────────────────────
async function fetchProfile(nassId: number, chamber: 'Senate' | 'House'): Promise<ProfileData> {
  const defaultTitle = chamber === 'Senate' ? 'Senator' : 'House Representative';
  const html = await httpGet(`${NASS_BASE}/mps/single/${nassId}`);
  if (!html) return { title: defaultTitle };

  // Strip tags for text-based regex matching
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // Office title
  let title = defaultTitle;
  const officeM = text.match(/OFFICE\s+([A-Z][^.]{3,70}?)(?:\s{2,}|DATE|PARTY|CHAMBER)/i);
  if (officeM) {
    const raw = officeM[1].trim();
    if (raw && raw.length < 80 && raw !== '-') title = raw;
  }

  // Date of birth (YYYY-MM-DD)
  const dobM = text.match(/DATE\s+OF\s+BIRTH\s+(\d{4}-\d{2}-\d{2})/i);

  // Email
  const emailM = html.match(/href="mailto:([^"@\s]+@[^"@\s]+)"/i);

  // Twitter/X handle
  const twitterM = html.match(/(?:twitter|x)\.com\/([^"'/?#\s]{1,30})/i);
  const twitterHandle = twitterM && twitterM[1] !== 'intent' ? `@${twitterM[1]}` : undefined;

  return {
    title,
    date_of_birth: dobM?.[1],
    email:         emailM?.[1],
    twitter:       twitterHandle,
  };
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
async function scrapeMembers(chamber: 'Senate' | 'House'): Promise<NASSMember[]> {
  const list      = await fetchMemberList(chamber);
  const work      = isFinite(LIMIT) ? list.slice(0, LIMIT) : list;
  const total     = work.length;
  const slugsSeen = new Set<string>();
  const results: NASSMember[] = [];

  if (total === 0) return [];

  if (FETCH_PROFILES) {
    console.log(`  → Fetching ${total} profiles (~${Math.ceil(total * DELAY_MS / 60000)} min)…`);
  }

  for (let i = 0; i < work.length; i++) {
    const m = work[i];

    let profile: ProfileData = {
      title: chamber === 'Senate' ? 'Senator' : 'House Representative',
    };

    if (FETCH_PROFILES) {
      process.stdout.write(`\r  [${String(i + 1).padStart(3)}/${total}] ${m.full_name.padEnd(42).slice(0, 42)}`);
      await sleep(DELAY_MS);
      profile = await fetchProfile(m.nass_id, chamber);
    }

    results.push({
      ...m,
      slug:          uniqueSlug(toSlug(m.full_name), slugsSeen),
      chamber,
      title:         profile.title,
      photo_url:     `${PHOTO_BASE}/${m.nass_id}.jpg`,
      nass_url:      `${NASS_BASE}/mps/single/${m.nass_id}`,
      date_of_birth: profile.date_of_birth,
      email:         profile.email,
      twitter:       profile.twitter,
      scraped_at:    new Date().toISOString(),
    });
  }

  if (FETCH_PROFILES) process.stdout.write('\n');
  console.log(`  ✓ ${chamber}: ${results.length} members`);
  return results;
}

// ─── Supabase Import ──────────────────────────────────────────────────────────
async function importToSupabase(members: NASSMember[]): Promise<void> {
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
  console.log(`\n📥 Importing ${members.length} members to Supabase…`);

  let added = 0, updated = 0, skipped = 0;
  const errs: string[] = [];

  for (const m of members) {
    // state_of_origin is NOT NULL in schema — use 'Unknown' as fallback for
    // leadership members scraped from HTML cards without full row data
    const stateOfOrigin = m.state || 'Unknown';
    // party is NOT NULL in positions — same fallback
    const party = m.party || 'Unknown';

    const { data: pol, error: e1 } = await db
      .from('politicians')
      .upsert(
        {
          full_name:       m.full_name,
          slug:            m.slug,
          // Keep photo_url managed by local Supabase storage migration/upload flow.
          // This prevents re-introducing external nass.gov.ng image URLs.
          date_of_birth:   m.date_of_birth ?? null,
          state_of_origin: stateOfOrigin,
          biography:       m.email ? `Email: ${m.email}` : null, // store email in bio until schema extends
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    if (e1 || !pol) {
      errs.push(`${m.full_name}: ${e1?.message}`);
      skipped++;
      continue;
    }

    const { data: existing } = await db
      .from('positions')
      .select('id')
      .eq('politician_id', pol.id)
      .eq('assembly_number', ASSEMBLY_NUMBER)
      .single();

    const pos = {
      politician_id:   pol.id,
      title:           m.title,
      chamber:         m.chamber,
      // 'office_level' not in schema — omitted
      constituency:    m.constituency || null,
      state:           m.state || null,
      party:           party,
      assembly_number: ASSEMBLY_NUMBER,
      start_date:      ASSEMBLY_START,
      is_current:      true,
    };

    if (existing) {
      await db.from('positions').update(pos).eq('id', existing.id);
      updated++;
    } else {
      await db.from('positions').insert(pos);
      added++;
    }

    process.stdout.write(
      `\r  → ${added + updated + skipped}/${members.length}  new:${added} upd:${updated} skip:${skipped}`
    );
  }

  process.stdout.write('\n');
  console.log(`\n  ✓ Import done — new: ${added}, updated: ${updated}, skipped: ${skipped}`);
  if (errs.length) {
    fs.writeFileSync(path.join(OUTPUT_DIR, 'import-errors.json'), JSON.stringify(errs, null, 2));
    console.warn(`  ⚠ ${errs.length} errors → import-errors.json`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🇳🇬  NaijaRep — NASS Scraper');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Chamber:        ${CHAMBER_ARG}`);
  console.log(`  Limit:          ${isFinite(LIMIT) ? LIMIT : 'all'}`);
  console.log(`  Fetch profiles: ${FETCH_PROFILES}`);
  console.log(`  Import to DB:   ${IMPORT_TO_DB}`);
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let allMembers: NASSMember[] = [];

  if (FROM_JSON) {
    const p = path.join(OUTPUT_DIR, 'all_members.json');
    if (!fs.existsSync(p)) {
      console.error(`✗ Not found: ${p} — run without --from-json first`);
      process.exit(1);
    }
    allMembers = JSON.parse(fs.readFileSync(p, 'utf-8'));
    console.log(`📂 Loaded ${allMembers.length} members from all_members.json`);
  } else {
    if (CHAMBER_ARG === 'all' || CHAMBER_ARG === 'senate') {
      const senators = await scrapeMembers('Senate');
      fs.writeFileSync(path.join(OUTPUT_DIR, 'senators.json'), JSON.stringify(senators, null, 2));
      console.log(`  💾 senators.json (${senators.length})`);
      allMembers = allMembers.concat(senators);
    }

    if (CHAMBER_ARG === 'all' || CHAMBER_ARG === 'house') {
      const reps = await scrapeMembers('House');
      fs.writeFileSync(path.join(OUTPUT_DIR, 'house_reps.json'), JSON.stringify(reps, null, 2));
      console.log(`  💾 house_reps.json (${reps.length})`);
      allMembers = allMembers.concat(reps);
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'all_members.json'), JSON.stringify(allMembers, null, 2));
    console.log(`  💾 all_members.json (${allMembers.length} total)`);

    // Quick stats
    const byChamber = allMembers.reduce((a, m) => ({ ...a, [m.chamber]: (a[m.chamber] ?? 0) + 1 }), {} as Record<string, number>);
    const byParty   = Object.entries(
      allMembers.reduce((a, m) => ({ ...a, [m.party]: (a[m.party] ?? 0) + 1 }), {} as Record<string, number>)
    ).sort((x, y) => y[1] - x[1]).slice(0, 6);

    console.log('\n  📊 By chamber:', Object.entries(byChamber).map(([k, v]) => `${k}: ${v}`).join(', '));
    console.log('  🏛️  Top parties:', byParty.map(([p, n]) => `${p}:${n}`).join('  '));
  }

  if (IMPORT_TO_DB) {
    await importToSupabase(allMembers);
  } else {
    console.log('\n  💡 Next: review scripts/output/all_members.json, then:');
    console.log('     npx tsx scripts/scrape-nass.ts --from-json --import');
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'scrape-log.json'),
    JSON.stringify({ scraped_at: new Date().toISOString(), total: allMembers.length }, null, 2)
  );

  console.log('\n✅ Done!\n');
}

main().catch(e => { console.error('\n✗ Fatal:', e); process.exit(1); });
