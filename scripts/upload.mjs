#!/usr/bin/env node
/**
 * Uploads a single manifest JSON to forkfeed.server via its admin API.
 *
 * Usage:
 *   node scripts/upload.mjs <json-file> [baseUrl]
 *
 * Examples:
 *   node scripts/upload.mjs manifests/counting-sheep.json
 *   node scripts/upload.mjs manifests/counting-sheep.json http://localhost:8787
 *
 * Auth: reads ADMIN_KEY env var (falls back to "admin").
 */

import './env.mjs';
import { basename, resolve } from 'node:path';
import { authCheck, uploadManifest, verifyManifest } from './upload-lib.mjs';

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node scripts/upload.mjs <json-file> [baseUrl]');
  process.exit(1);
}

const BASE = process.argv[3] || process.env.CARD_SERVER_URL;
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

console.log(`\nUploading ${basename(resolve(jsonPath))} to ${BASE}\n`);

try {
  const stats = await uploadManifest(jsonPath, BASE, ADMIN_KEY);

  console.log(`\n── Summary ──`);
  console.log(`  Created: ${stats.created}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed:  ${stats.failed}`);

  // Verify
  try {
    const READ_KEY = process.env.READ_KEY || ADMIN_KEY;
    const manifest = await verifyManifest(BASE, READ_KEY);
    console.log(`\n── Manifest (${manifest.forks?.length || 0} forks, ${manifest.feeds?.length || 0} feeds) ──`);
    for (const f of manifest.forks || []) {
      console.log(`  Fork: ${f.title} (${f.feedIds.length} feeds)`);
    }
    for (const s of manifest.feeds || []) {
      console.log(`  ${s.id}: ${s.title} (${s.cardCount ?? '?'} cards)`);
    }
  } catch (err) {
    console.log(`\n⚠ Could not verify manifest: ${err.message}`);
  }

  console.log('');
  process.exit(stats.failed > 0 ? 1 : 0);
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
