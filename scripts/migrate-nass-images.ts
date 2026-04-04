/**
 * NaijaRep — Migrate NASS-hosted photos to Supabase Storage
 * ==========================================================
 * Fetches politician photos currently hosted on nass.gov.ng,
 * optimizes to WebP, uploads to your own Supabase bucket,
 * and updates politicians.photo_url to local storage URLs.
 *
 * Usage:
 *   npx tsx scripts/migrate-nass-images.ts              # dry run summary
 *   npx tsx scripts/migrate-nass-images.ts --import     # execute migration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const IMPORT_TO_DB = process.argv.includes('--import');
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');

interface PoliticianPhoto {
  id: string;
  slug: string;
  full_name: string;
  photo_url: string;
}

async function optimizeToWebP(imageBytes: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(imageBytes))
    .rotate()
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toBuffer();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('\n🖼️  NaijaRep — NASS Photo Migration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Mode: ${IMPORT_TO_DB ? 'IMPORT' : 'DRY RUN'}\n`);

  const { data, error } = await db
    .from('politicians')
    .select('id, slug, full_name, photo_url')
    .ilike('photo_url', 'https://nass.gov.ng/%');

  if (error) {
    console.error('Failed to fetch politicians:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as PoliticianPhoto[];
  console.log(`  Found ${rows.length} NASS-hosted photo(s).`);

  if (!rows.length) {
    console.log('\n✅ Nothing to migrate.\n');
    return;
  }

  if (!IMPORT_TO_DB) {
    const outFile = path.join(OUTPUT_DIR, 'nass-image-candidates.json');
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
    console.log(`  Saved candidates -> ${outFile}`);
    console.log('\n  Run with --import to migrate and update photo_url values.\n');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  const failures: Array<{ id: string; name: string; error: string }> = [];

  for (const row of rows) {
    try {
      const response = await fetch(row.photo_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const originalBytes = await response.arrayBuffer();
      const optimized = await optimizeToWebP(originalBytes);

      const filePath = `politicians/${row.slug || row.id}.webp`;

      const { error: uploadError } = await db.storage
        .from('politician-photos')
        .upload(filePath, optimized, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = db.storage
        .from('politician-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await db
        .from('politicians')
        .update({ photo_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      migrated++;
      console.log(`  ✓ ${row.full_name}`);
    } catch (error) {
      skipped++;
      failures.push({
        id: row.id,
        name: row.full_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`  ✗ ${row.full_name}`);
    }
  }

  const report = {
    total: rows.length,
    migrated,
    skipped,
    failures,
    completed_at: new Date().toISOString(),
  };

  const reportFile = path.join(OUTPUT_DIR, 'nass-photo-migration-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(`\n  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Report:   ${reportFile}`);
  console.log('\n✅ Done!\n');
}

main().catch((error) => {
  console.error('\n✗ Fatal:', error);
  process.exit(1);
});
