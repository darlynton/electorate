/**
 * NaijaRep — House of Representatives Wikipedia Scraper
 * =======================================================
 * Scrapes all 360 House of Reps members from Wikipedia and imports
 * those missing from the DB. Uses upsert so existing NASS members
 * are not duplicated.
 *
 * Source: https://en.wikipedia.org/wiki/List_of_members_of_the_House_of_Representatives_of_Nigeria,_2023–2027
 *
 * Usage:
 *   npx tsx scripts/scrape-house-wiki.ts              # dry run — saves JSON only
 *   npx tsx scripts/scrape-house-wiki.ts --import     # save JSON + upsert to Supabase
 *
 * Output: scripts/output/house_reps_wiki.json
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const IMPORT_TO_DB = process.argv.includes('--import');
const OUTPUT_DIR   = path.join(process.cwd(), 'scripts', 'output');

const WIKI_URL = 'https://en.wikipedia.org/wiki/List_of_members_of_the_House_of_Representatives_of_Nigeria,_2023%E2%80%932027';
const TERM_START = '2023-06-13';
const TERM_END   = '2027-06-12';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RepRecord {
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

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ─── Scrape Wikipedia ─────────────────────────────────────────────────────────
async function scrapeWikipedia(): Promise<RepRecord[]> {
  console.log('  🌐 Fetching Wikipedia page…');
  const res = await fetch(WIKI_URL, {
    headers: { 'User-Agent': 'NaijaRep-Scraper/1.0 (educational project)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const html = await res.text();

  const $ = cheerio.load(html);
  const records: RepRecord[] = [];

  // Find the Members table — it's the first wikitable in the Members section
  const membersTables = $('table.wikitable');
  
  if (membersTables.length === 0) {
    throw new Error('No wikitables found on page');
  }

  // The members table should have headers: State, Constituency, Member, Party, Since
  // Find it by checking for these headers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let membersTable: any = null;
  membersTables.each((_, tbl) => {
    const headerText = $(tbl).find('th').first().text().trim().toLowerCase();
    if (headerText === 'state' || headerText.includes('state')) {
      membersTable = $(tbl);
      return false; // break
    }
  });

  if (!membersTable) {
    // Fallback: use the largest table
    let maxRows = 0;
    membersTables.each((_, tbl) => {
      const rowCount = $(tbl).find('tr').length;
      if (rowCount > maxRows) {
        maxRows = rowCount;
        membersTable = $(tbl);
      }
    });
  }

  if (!membersTable) throw new Error('Could not find members table');

  console.log('  📊 Parsing members table…');

  // Parse with rowspan tracking
  let currentState = '';
  // Track cells already consumed by rowspans: rowspanTracker[rowIndex][colIndex] = remaining rows
  const rowspanData: Map<number, string>[] = [];
  let globalRowIndex = 0;

  const rows = $(membersTable).find('tr');
  console.log(`  Found ${rows.length} rows in table`);

  rows.each((_, row) => {
    const cells = $(row).find('td, th');
    if (cells.length === 0) return; // header row
    
    // Check if this is a header row
    const firstCell = cells.first();
    if (firstCell.is('th')) return;

    // Build the current row's column data by filling in rowspan values
    if (!rowspanData[globalRowIndex]) rowspanData[globalRowIndex] = new Map();
    
    const rowMap = rowspanData[globalRowIndex];
    const resolvedCols: string[] = [];
    let cellIdx = 0;
    let colPos = 0;

    while (resolvedCols.length < 5 && cellIdx <= cells.length) {
      // Check if this column is filled by a rowspan from above
      if (rowMap.has(colPos)) {
        resolvedCols.push(rowMap.get(colPos)!);
        colPos++;
        continue;
      }

      // Get actual cell from this row
      if (cellIdx >= cells.length) {
        colPos++;
        continue;
      }

      const cell = $(cells[cellIdx]);
      const cellText = cleanText(cell.text());
      const rowspan = parseInt(cell.attr('rowspan') || '1', 10);
      const colspan = parseInt(cell.attr('colspan') || '1', 10);

      // If rowspan > 1, store for future rows
      if (rowspan > 1) {
        for (let r = 1; r < rowspan; r++) {
          if (!rowspanData[globalRowIndex + r]) rowspanData[globalRowIndex + r] = new Map();
          for (let c = 0; c < colspan; c++) {
            rowspanData[globalRowIndex + r].set(colPos + c, cellText);
          }
        }
      }

      for (let c = 0; c < colspan; c++) {
        resolvedCols.push(cellText);
      }

      colPos += colspan;
      cellIdx++;
    }

    globalRowIndex++;

    if (resolvedCols.length < 3) return;

    // Expected columns: State | Constituency | Member | (party icon) | Party | Since
    // But party icon column might be absent or merged
    // Detect column structure
    let state = '', constituency = '', member = '', party = '';

    if (resolvedCols.length >= 5) {
      state        = resolvedCols[0];
      constituency = resolvedCols[1];
      member       = resolvedCols[2];
      // resolvedCols[3] is party flag/icon (ignore)
      party        = resolvedCols[4];
    } else if (resolvedCols.length === 4) {
      state        = resolvedCols[0];
      constituency = resolvedCols[1];
      member       = resolvedCols[2];
      party        = resolvedCols[3];
    } else {
      return; // Not enough columns
    }

    // Keep track of current state (for rows where state cell is absent due to rowspan)
    if (state.length > 0 && state.length < 30 && !state.includes('/') && /^[A-Z]/.test(state)) {
      currentState = state;
    }
    const effectiveState = state || currentState;

    // Skip if no member name or looks like a header
    if (!member || member.toLowerCase() === 'member' || member.toLowerCase() === 'state') return;

    // Skip empty or suspicious entries
    if (member.length < 3) return;

    // Normalize party abbreviation (remove trailing numbers, extra spaces)
    const partyClean = party.replace(/\[\d+\]/g, '').trim().toUpperCase();

    records.push({
      full_name:    member,
      state:        effectiveState,
      constituency: constituency,
      party:        partyClean,
      start_date:   TERM_START,
      end_date:     TERM_END,
      is_current:   true,
      slug:         toSlug(member),
      photo_url:    null,
    });
  });

  return records;
}

// ─── Cross-reference with existing DB data ────────────────────────────────────
function loadExistingReps(): Set<string> {
  const filePath = path.join(OUTPUT_DIR, 'all_members.json');
  if (!fs.existsSync(filePath)) return new Set();
  const data: Array<{ slug: string; constituency?: string }> = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return new Set(data.filter(m => m.constituency?.includes('Fed') || true).map(m => m.slug));
}

// ─── Supabase Import ──────────────────────────────────────────────────────────
async function importToSupabase(reps: RepRecord[]): Promise<void> {
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
  console.log(`\n📥 Importing ${reps.length} House members to Supabase…\n`);

  let added = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  for (const r of reps) {
    // Upsert politician row
    const { data: pol, error: polErr } = await db
      .from('politicians')
      .upsert(
        {
          full_name:       r.full_name,
          slug:            r.slug,
          photo_url:       r.photo_url,
          state_of_origin: r.state,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    if (polErr || !pol) {
      console.error(`  ✗ ${r.full_name}: ${polErr?.message}`);
      errors.push(`${r.full_name}: ${polErr?.message}`);
      skipped++;
      continue;
    }

    // Check for existing position in House chamber (regardless of exact title)
    const { data: existing } = await db
      .from('positions')
      .select('id')
      .eq('politician_id', pol.id)
      .eq('chamber', 'House')
      .single();

    const posData = {
      politician_id: pol.id,
      title:         'House Representative',
      chamber:       'House',
      constituency:  r.constituency,
      state:         r.state,
      party:         r.party,
      start_date:    r.start_date,
      end_date:      r.end_date,
      is_current:    r.is_current,
    };

    if (existing) {
      const { error: updErr } = await db
        .from('positions')
        .update(posData)
        .eq('id', existing.id);
      if (updErr) {
        errors.push(`position ${r.full_name}: ${updErr.message}`);
        skipped++;
        continue;
      }
      updated++;
    } else {
      const { error: insErr } = await db
        .from('positions')
        .insert(posData);
      if (insErr) {
        errors.push(`position ${r.full_name}: ${insErr.message}`);
        skipped++;
        continue;
      }
      added++;
    }

    if ((added + updated) % 20 === 0) {
      console.log(`  ✓ [${String(added + updated).padStart(3)}] ${r.full_name.padEnd(35)} (${r.state}, ${r.party})`);
    }
  }

  console.log(`\n  ✓ Done — new: ${added}, updated: ${updated}, skipped: ${skipped}`);

  if (errors.length) {
    const errFile = path.join(OUTPUT_DIR, 'house-wiki-errors.json');
    fs.writeFileSync(errFile, JSON.stringify(errors, null, 2));
    console.warn(`  ⚠  ${errors.length} error(s) → ${errFile}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🇳🇬  NaijaRep — House of Reps Wikipedia Scraper');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Source: Wikipedia 2023–2027 House members`);
  console.log(`  Import: ${IMPORT_TO_DB}`);
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let allReps: RepRecord[];
  try {
    allReps = await scrapeWikipedia();
  } catch (err) {
    console.error('\n✗ Scraping failed:', err);
    process.exit(1);
  }

  // Deduplicate by slug
  const seen = new Set<string>();
  const deduped = allReps.filter(r => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });

  console.log(`  ✓ Scraped ${allReps.length} rows → ${deduped.length} unique members`);

  // Party breakdown
  const byParty: Record<string, number> = {};
  for (const r of deduped) { byParty[r.party] = (byParty[r.party] ?? 0) + 1; }
  console.log('  🏛️  By party:', Object.entries(byParty).sort((a,b) => b[1]-a[1]).map(([p,n]) => `${p}:${n}`).join('  '));

  // State breakdown
  const byState: Record<string, number> = {};
  for (const r of deduped) { byState[r.state] = (byState[r.state] ?? 0) + 1; }
  console.log('  📍 States covered:', Object.keys(byState).length, '(expected 36 + FCT)');

  // Save JSON
  const outFile = path.join(OUTPUT_DIR, 'house_reps_wiki.json');
  fs.writeFileSync(outFile, JSON.stringify(deduped, null, 2));
  console.log(`\n  💾 Saved → ${outFile}`);

  if (IMPORT_TO_DB) {
    await importToSupabase(deduped);
  } else {
    console.log('\n  💡 Run with --import to upsert all into Supabase (safe, no duplicates):');
    console.log('     npx tsx scripts/scrape-house-wiki.ts --import\n');
  }

  console.log('\n✅ Done!\n');
}

main().catch(e => { console.error('\n✗ Fatal:', e); process.exit(1); });
