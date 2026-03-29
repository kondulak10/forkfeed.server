#!/usr/bin/env node
/**
 * Deregister this forkfeed server from the app-server.
 * Cascade deletes all forks, feeds, and the content backend entry.
 *
 * Usage:
 *   node scripts/delete.mjs [--yes]
 *
 * Environment variables:
 *   AUTH_TOKEN       - JWT from app-server (required)
 *   CARD_SERVER_URL  - Public URL of this forkfeed server (required)
 *   APP_SERVER_URL   - App-server base URL (default: http://localhost:4001)
 */

import './env.mjs';
import { createInterface } from 'node:readline';

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
const skipConfirm = process.argv.includes('--yes');

if (!skipConfirm) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(
      `This will delete ALL forks and feeds from ${CARD_SERVER_URL} on the app-server. Continue? (y/N) `,
      resolve,
    );
  });
  rl.close();
  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    process.exit(0);
  }
}

console.log(`Deregistering ${CARD_SERVER_URL} from ${APP_SERVER_URL}...`);

try {
  const res = await fetch(`${APP_SERVER_URL}/api/forks/register`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({ baseUrl: CARD_SERVER_URL }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`Deregistration complete.`);
    console.log(`  Deleted forks: ${data.deletedForks}`);
    console.log(`  Deleted feeds: ${data.deletedFeeds}`);
  } else {
    console.error(`Failed: ${data.error || res.statusText}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}
