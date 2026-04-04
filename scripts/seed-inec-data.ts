/**
 * seed-inec-data.ts
 * Populates the INEC geographic hierarchy tables (inec_states, inec_lgas, inec_wards, inec_polling_units)
 * from the `nigerian-states-lgas-and-polling-units` npm package.
 *
 * Usage:
 *   npx tsx scripts/seed-inec-data.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  getStates,
  getLGAsByState,
  getWardsByLGA,
  getPollingUnitsByWard,
} from 'nigerian-states-lgas-and-polling-units';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BATCH_SIZE = 500;

async function upsertBatch<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting into ${table} (batch ${i / BATCH_SIZE + 1}):`, error.message);
      throw error;
    }
    inserted += batch.length;
  }
  return inserted;
}

async function main() {
  console.log('🇳🇬 Starting INEC geographic data seed...\n');

  // 1. States
  const states = getStates();
  const stateRows = states.map((s: { id: string; name: string }) => ({
    id: s.id,
    name: s.name,
  }));
  const statesInserted = await upsertBatch('inec_states', stateRows);
  console.log(`✅ States:  ${statesInserted} rows`);

  // 2. LGAs
  let totalLgas = 0;
  const lgaRows: { id: string; name: string; state_id: string }[] = [];
  for (const state of states) {
    const lgas = getLGAsByState(state.id);
    for (const lga of lgas) {
      lgaRows.push({ id: lga.id, name: lga.name, state_id: state.id });
    }
  }
  totalLgas = await upsertBatch('inec_lgas', lgaRows);
  console.log(`✅ LGAs:    ${totalLgas} rows`);

  // 3. Wards
  let totalWards = 0;
  const wardRows: { id: string; name: string; lga_id: string }[] = [];
  for (const lga of lgaRows) {
    const wards = getWardsByLGA(lga.id);
    for (const ward of wards) {
      wardRows.push({ id: ward.id, name: ward.name, lga_id: lga.id });
    }
  }
  totalWards = await upsertBatch('inec_wards', wardRows);
  console.log(`✅ Wards:   ${totalWards} rows`);

  // 4. Polling Units
  let totalPUs = 0;
  const puRows: { id: string; name: string; ward_id: string }[] = [];
  for (const ward of wardRows) {
    const pus = getPollingUnitsByWard(ward.id);
    for (const pu of pus) {
      puRows.push({ id: pu.id, name: pu.name, ward_id: ward.id });
    }
  }
  console.log(`   Collected ${puRows.length} polling units, inserting in batches...`);
  totalPUs = await upsertBatch('inec_polling_units', puRows);
  console.log(`✅ PUs:     ${totalPUs} rows`);

  console.log('\n🎉 INEC geographic data seeded successfully!');
  console.log(`   ${statesInserted} states, ${totalLgas} LGAs, ${totalWards} wards, ${totalPUs} polling units`);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
