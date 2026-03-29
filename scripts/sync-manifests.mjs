#!/usr/bin/env node
/**
 * Uploads ALL manifest JSON files from manifests/ to forkfeed.server.
 *
 * Usage:
 *   node scripts/sync-manifests.mjs [baseUrl]
 *
 * Auth: reads ADMIN_KEY env var (falls back to "admin").
 */

import './env.mjs';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { authCheck, uploadManifest, verifyManifest } from './upload-lib.mjs';

const BASE = process.argv[2] || process.env.CARD_SERVER_URL;
if (!BASE) {
  console.error('Error: provide a base URL as argument or set CARD_SERVER_URL env var');
  process.exit(1);
}
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin';

try {
  await authCheck(BASE, ADMIN_KEY);
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}

const manifestsDir = resolve('manifests');
const files = readdirSync(manifestsDir).filter((f) => f.endsWith('.json')).sort();

if (files.length === 0) {
  console.error('No manifest files found in manifests/');
  process.exit(1);
}

console.log(`\nSyncing ${files.length} manifests to ${BASE}\n`);

const totals = { created: 0, updated: 0, skipped: 0, failed: 0 };
let failedFiles = 0;

for (const file of files) {
  const filePath = join(manifestsDir, file);
  console.log(`  ${file}`);
  try {
    const stats = await uploadManifest(filePath, BASE, ADMIN_KEY, { quiet: true });
    const parts = [];
    if (stats.created) parts.push(`${stats.created} created`);
    if (stats.updated) parts.push(`${stats.updated} updated`);
    if (stats.failed) parts.push(`${stats.failed} failed`);
    if (parts.length === 0) parts.push('no changes');
    console.log(`    ${stats.failed ? '✗' : '✓'} ${parts.join(', ')}`);
    totals.created += stats.created;
    totals.updated += stats.updated;
    totals.skipped += stats.skipped;
    totals.failed += stats.failed;
    if (stats.failed) failedFiles++;
  } catch (err) {
    console.log(`    ✗ ${err.message}`);
    failedFiles++;
  }
}

console.log(`\n── Summary ──`);
console.log(`  Files:   ${files.length} (${failedFiles ? failedFiles + ' with errors' : 'all OK'})`);
console.log(`  Created: ${totals.created}`);
console.log(`  Updated: ${totals.updated}`);
console.log(`  Skipped: ${totals.skipped}`);
console.log(`  Failed:  ${totals.failed}`);

// Verify
try {
  const READ_KEY = process.env.READ_KEY || ADMIN_KEY;
  const manifest = await verifyManifest(BASE, READ_KEY);
  console.log(`\n── Live manifest: ${manifest.forks?.length || 0} forks, ${manifest.feeds?.length || 0} feeds ──`);
} catch (err) {
  console.log(`\n⚠ Could not verify manifest: ${err.message}`);
}

console.log('');
process.exit(totals.failed > 0 ? 1 : 0);
