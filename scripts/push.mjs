#!/usr/bin/env node

/**
 * Push manifest(s) to forkfeed via the app-server /api/content/push endpoint.
 *
 * Usage:
 *   node scripts/push.mjs manifests/foo.json   # push one manifest
 *   node scripts/push.mjs --all                # push all manifests
 *   node scripts/push.mjs                      # no args = push all
 */

import './env.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const token = process.env.FORKFEED_TOKEN;
if (!token) {
  console.error(
    'Missing FORKFEED_TOKEN. Get one at forkfeed.link/admin/user/token and add it to .dev.vars',
  );
  process.exit(1);
}

const appServerUrl = (process.env.APP_SERVER_URL || 'https://api.forkfeed.link').replace(/\/$/, '');
const args = process.argv.slice(2);

// Resolve which manifest files to push
let files;
if (args.length === 0 || args.includes('--all')) {
  const dir = resolve('manifests');
  files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => resolve(dir, f));
  if (files.length === 0) {
    console.error('No .json files found in manifests/');
    process.exit(1);
  }
} else {
  files = args.filter((a) => !a.startsWith('--')).map((f) => resolve(f));
}

const MAX_BODY_BYTES = 80_000; // stay under app-server body limit
const PUSH_DELAY_MS = 2000; // delay between requests to avoid 429
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pushPayload(payload) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${appServerUrl}/api/content/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ manifest: payload }),
    });
    if (res.status === 429) {
      const wait = Math.min(5000 * 2 ** attempt, 60_000);
      console.log(`    rate limited, retrying in ${(wait / 1000).toFixed(0)}s...`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  // Return a synthetic 429 if all retries exhausted
  return { status: 429, json: async () => ({ error: 'Rate limited after retries' }) };
}

/**
 * Group cards by feedId, then batch feed-groups into chunks
 * that stay under MAX_BODY_BYTES when serialized.
 */
function chunkCards(cards) {
  const byFeed = new Map();
  for (const card of cards) {
    const fid = card.feedId || '';
    if (!byFeed.has(fid)) byFeed.set(fid, []);
    byFeed.get(fid).push(card);
  }

  const chunks = [];
  let current = [];
  let currentSize = 0;

  for (const [, feedCards] of byFeed) {
    const groupSize = JSON.stringify(feedCards).length;
    if (current.length > 0 && currentSize + groupSize > MAX_BODY_BYTES) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(...feedCards);
    currentSize += groupSize;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

let ok = 0;
let failed = 0;

for (const file of files) {
  const name = basename(file);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`  ${name}: failed to read/parse - ${err.message}`);
    failed++;
    continue;
  }

  const { forks = [], feeds = [], cards = [] } = manifest;
  if (forks.length === 0) {
    console.error(`  ${name}: skipped (no forks)`);
    continue;
  }

  console.log(`  ${name}: pushing ${forks.length} fork(s), ${feeds.length} feed(s), ${cards.length} card(s)...`);

  // Check if the whole manifest fits in a single request
  const fullBody = JSON.stringify({ manifest: { forks, feeds, cards } });
  const needsChunking = fullBody.length > MAX_BODY_BYTES;

  let pushFailed = false;

  try {
    if (!needsChunking) {
      // Small manifest - single request
      const res = await pushPayload({ forks, feeds, cards });
      if (res.status !== 201) {
        const body = await res.json().catch(() => ({}));
        console.error(`  ${name}: failed (${res.status}) - ${body.error || 'unknown error'}`);
        pushFailed = true;
      }
    } else {
      // Large manifest - send structure first, then card chunks
      const structRes = await pushPayload({ forks, feeds });
      if (structRes.status !== 201) {
        const body = await structRes.json().catch(() => ({}));
        console.error(`  ${name}: failed (${structRes.status}) - ${body.error || 'unknown error'}`);
        pushFailed = true;
      }

      if (!pushFailed) {
        const chunks = chunkCards(cards);
        for (let i = 0; i < chunks.length; i++) {
          await sleep(PUSH_DELAY_MS);
          // App-server requires at least one fork per request
          const res = await pushPayload({ forks, cards: chunks[i] });
          if (res.status !== 201) {
            const body = await res.json().catch(() => ({}));
            console.error(`  ${name}: card chunk ${i + 1}/${chunks.length} failed (${res.status}) - ${body.error || 'unknown error'}`);
            pushFailed = true;
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error(`  ${name}: network error - ${err.message}`);
    pushFailed = true;
  }

  if (pushFailed) {
    failed++;
  } else {
    const forkTitle = forks[0]?.title || forks[0]?._id || forks[0]?.id || '';
    console.log(`  ${name}: OK - ${forkTitle} (${feeds.length} feeds)`);
    ok++;
  }

  // Delay between manifests to avoid rate limiting
  if (files.indexOf(file) < files.length - 1) await sleep(PUSH_DELAY_MS);
}

console.log(`\nDone: ${ok} pushed, ${failed} failed (${files.length} total)`);
if (failed > 0) process.exit(1);
