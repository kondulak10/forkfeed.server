#!/usr/bin/env node
/**
 * Re-sync this forkfeed server's forks and feeds with the app-server.
 * Tells the app-server to re-fetch the manifest and update metadata.
 *
 * Usage:
 *   node scripts/update.mjs
 *
 * Environment variables:
 *   AUTH_TOKEN       - JWT from app-server (required)
 *   CARD_SERVER_URL  - Public URL of this forkfeed server (required)
 *   APP_SERVER_URL   - App-server base URL (default: http://localhost:4001)
 */
import './env.mjs';

const AUTH_TOKEN = process.env.AUTH_TOKEN;
if (!AUTH_TOKEN) {
  console.error('Error: AUTH_TOKEN environment variable is required');
  process.exit(1);
}

const CARD_SERVER_URL = process.env.CARD_SERVER_URL;
if (!CARD_SERVER_URL) {
  console.error('Error: CARD_SERVER_URL environment variable is required');
  process.exit(1);
}
const APP_SERVER_URL = process.env.APP_SERVER_URL || 'http://localhost:4001';

const READ_KEY = process.env.READ_KEY || 'read';

console.log(`Syncing ${CARD_SERVER_URL} with ${APP_SERVER_URL}...`);

try {
  // Fetch forkfeed server manifest to know expected feed counts
  const manifestRes = await fetch(`${CARD_SERVER_URL}/.well-known/forkfeed.json`, {
    headers: { Authorization: `Bearer ${READ_KEY}` },
  });
  const manifest = manifestRes.ok ? await manifestRes.json() : null;
  const expectedFeedCount = manifest?.feeds?.length || 0;

  const res = await fetch(`${APP_SERVER_URL}/api/forks/register`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({ baseUrl: CARD_SERVER_URL }),
  });

  const data = await res.json();

  if (res.ok) {
    const actualFeeds = data.feeds?.length || 0;
    const feedMismatch = expectedFeedCount > 0 && actualFeeds !== expectedFeedCount;

    console.log(`Sync complete.`);
    console.log(`  Backend: ${data.contentBackend?.name}`);
    console.log(`  Forks: ${data.forks?.length || 0}`);
    console.log(`  Feeds: ${actualFeeds}${expectedFeedCount ? `/${expectedFeedCount}` : ''}${feedMismatch ? ' *** MISMATCH ***' : ''}`);
    console.log(`  Changed: ${data.synced}`);

    if (feedMismatch) {
      console.error(`\n  WARNING: App-server has ${actualFeeds} feeds but forkfeed server manifest has ${expectedFeedCount}.`);
      console.error(`  Some feeds may not load in the mobile app. Try re-registering affected forks.`);
    }
  } else {
    console.error(`Sync failed: ${data.error || res.statusText}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Sync failed: ${err.message}`);
  process.exit(1);
}
