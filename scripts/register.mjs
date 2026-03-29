#!/usr/bin/env node
/**
 * Register forks from this forkfeed server with the forkfeed app-server.
 * Fetches the manifest, then POSTs each fork to the app-server's REST endpoint.
 *
 * Usage:
 *   node scripts/register.mjs [--fork=<fork-id>] [--all]
 *
 * Environment variables:
 *   AUTH_TOKEN       - JWT from app-server (required)
 *   CARD_SERVER_URL  - Public URL of this forkfeed server (required)
 *   READ_KEY         - Forkfeed server read key (default: "read")
 *   APP_SERVER_URL   - App-server base URL (default: http://localhost:4001)
 */
import './env.mjs';

const AUTH_TOKEN = process.env.AUTH_TOKEN;
if (!AUTH_TOKEN) {
  console.error('Error: AUTH_TOKEN environment variable is required');
  console.error('Get one via: curl -s -X POST http://localhost:4001/api/auth/dev | jq -r .token');
  process.exit(1);
}

const CARD_SERVER_URL = process.env.CARD_SERVER_URL;
if (!CARD_SERVER_URL) {
  console.error('Error: CARD_SERVER_URL environment variable is required');
  process.exit(1);
}
const READ_KEY = process.env.READ_KEY || 'read';
const APP_SERVER_URL = process.env.APP_SERVER_URL || 'http://localhost:4001';

const forkIdArg = process.argv.find((a) => a.startsWith('--fork='))?.split('=')[1];
const registerAll = process.argv.includes('--all');

// ── Fetch manifest ───────────────────────────────────────

console.log(`Fetching manifest from ${CARD_SERVER_URL}...`);

const manifestRes = await fetch(`${CARD_SERVER_URL}/.well-known/forkfeed.json`, {
  headers: { Authorization: `Bearer ${READ_KEY}` },
});

if (!manifestRes.ok) {
  console.error(`Failed to fetch manifest: HTTP ${manifestRes.status}`);
  process.exit(1);
}

const manifest = await manifestRes.json();
const forks = manifest.forks || [];

if (forks.length === 0) {
  console.error('No forks found in manifest. Upload content first.');
  process.exit(1);
}

console.log(`Found ${forks.length} fork(s) in manifest:`);
forks.forEach((f, i) => console.log(`  ${i + 1}. ${f.title} (${f.id})`));

// ── Select forks to register ─────────────────────────────

let selected;
if (forkIdArg) {
  const fork = forks.find((f) => f.id === forkIdArg);
  if (!fork) {
    console.error(`Fork "${forkIdArg}" not found in manifest`);
    process.exit(1);
  }
  selected = [fork];
} else if (registerAll || forks.length === 1) {
  selected = forks;
} else {
  console.log('\nUse --fork=<id> to register a specific fork, or --all to register all.');
  process.exit(0);
}

// ── Register each fork ───────────────────────────────────

console.log(`\nRegistering ${selected.length} fork(s) with ${APP_SERVER_URL}...\n`);

for (const fork of selected) {
  const body = {
    baseUrl: CARD_SERVER_URL,
    readKey: READ_KEY,
    fork: {
      externalForkId: fork.id,
      title: fork.title,
      description: fork.description,
      imageSrc: fork.imageSrc,
      feedIds: fork.feedIds,
      ...(fork.actionLabel && { actionLabel: fork.actionLabel }),
      ...(fork.actionUrl && { actionUrl: fork.actionUrl }),
    },
  };

  try {
    const res = await fetch(`${APP_SERVER_URL}/api/forks/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      const expectedFeeds = fork.feedIds.length;
      const actualFeeds = data.feeds?.length || 0;
      const feedMismatch = actualFeeds !== expectedFeeds;

      console.log(`  [${feedMismatch ? 'WARN' : 'OK'}] ${fork.title}`);
      console.log(`        Fork ID: ${data.fork?.id}`);
      console.log(`        Feeds: ${actualFeeds}/${expectedFeeds}${feedMismatch ? ' *** MISMATCH ***' : ''}`);
      console.log(`        Backend: ${data.contentBackend?.name}`);

      if (feedMismatch) {
        console.error(`        Expected ${expectedFeeds} feeds but app-server created ${actualFeeds}.`);
        console.error(`        Some feeds may not load in the mobile app. Try re-registering.`);

        // Show which feeds were created vs expected
        const createdIds = (data.feeds || []).map((f) => f.externalFeedId || f.id);
        const missing = fork.feedIds.filter((id) => !createdIds.includes(id));
        if (missing.length > 0) {
          console.error(`        Missing feeds: ${missing.join(', ')}`);
        }
      }
    } else {
      console.error(`  [FAIL] ${fork.title}: ${data.error || res.statusText}`);
    }
  } catch (err) {
    console.error(`  [FAIL] ${fork.title}: ${err.message}`);
  }
}

console.log('\nDone.');
