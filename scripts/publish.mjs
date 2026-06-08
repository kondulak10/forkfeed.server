#!/usr/bin/env node
// Register every fork on this (already-deployed) server with the forkfeed app, so
// they show up in the app. Run after `npm run deploy` (the `publish` npm script does
// both). Each fork is registered as PRIVATE; flip visibility to public in the app.
//
// Reads from .dev.vars / env:
//   FORKFEED_SERVER_URL  - your deployed worker URL (required), e.g. https://x.workers.dev
//   FORKFEED_TOKEN       - your forkfeed API token ff_... (required, from forkfeed.link/admin/user/token)
//   READ_KEY             - read key for your worker (default "read")
//   APP_SERVER_URL       - forkfeed app-server base (default https://api.forkfeed.link)

import './env.mjs';

const SERVER_URL = (process.env.FORKFEED_SERVER_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.FORKFEED_TOKEN || '';
const READ_KEY = process.env.READ_KEY || 'read';
const APP_SERVER_URL = (process.env.APP_SERVER_URL || 'https://api.forkfeed.link').replace(/\/+$/, '');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!SERVER_URL) fail('FORKFEED_SERVER_URL is not set (your deployed worker URL). Add it to .dev.vars.');
if (!TOKEN) fail('FORKFEED_TOKEN is not set. Get one at forkfeed.link/admin/user/token and add it to .dev.vars.');

async function main() {
  // 1. Discover this server's forks.
  const listRes = await fetch(`${SERVER_URL}/forks`, {
    headers: { Authorization: `Bearer ${READ_KEY}` },
  });
  if (!listRes.ok) {
    fail(`Could not list forks from ${SERVER_URL}/forks (HTTP ${listRes.status}). Is the worker deployed and is READ_KEY correct?`);
  }
  const { forks } = await listRes.json();
  if (!forks || forks.length === 0) fail('No forks found on the server. Add content under forks/ and deploy first.');

  console.log(`Publishing ${forks.length} fork(s) from ${SERVER_URL} to ${APP_SERVER_URL}:\n`);

  // 2. Register each fork with the app (idempotent; creates as private).
  let ok = 0;
  for (const fork of forks) {
    const res = await fetch(`${APP_SERVER_URL}/api/content/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ forkServerUrl: SERVER_URL, forkId: fork.id, readKey: READ_KEY }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      ok++;
      console.log(`  ✓ ${fork.id}  (${data.feeds?.length ?? fork.feedCount ?? '?'} feeds, ${data.fork?.visibility || 'private'})`);
    } else {
      console.log(`  ✗ ${fork.id}  - ${data.error || `HTTP ${res.status}`}`);
    }
  }

  console.log(`\n${ok}/${forks.length} published. Forks start private - set visibility to public in the app to share them.`);
  if (ok < forks.length) process.exit(1);
}

main().catch((err) => fail(err.message));
