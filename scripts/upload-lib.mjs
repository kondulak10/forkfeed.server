/**
 * Shared upload logic for forkfeed.server admin API.
 * Used by upload.mjs (single file) and sync-manifests.mjs (all files).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

// ── Auth check ──────────────────────────────────────────────

export async function authCheck(baseUrl, adminKey) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminKey}`,
  };
  try {
    const res = await fetch(`${baseUrl}/admin/stats`, { headers });
    if (res.status === 401) {
      throw new Error('Authentication failed - ADMIN_KEY does not match');
    }
  } catch (err) {
    if (err.message.includes('Authentication failed')) throw err;
    throw new Error(`Cannot reach forkfeed server at ${baseUrl}: ${err.message}`);
  }
}

// ── HTTP helpers ────────────────────────────────────────────

function makeHeaders(adminKey) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminKey}`,
  };
}

async function post(baseUrl, endpoint, body, headers) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function put(baseUrl, endpoint, body, headers) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ── Upload a single manifest file ───────────────────────────

/**
 * Uploads forks, feeds, and cards from a manifest JSON file.
 * Returns { created, updated, skipped, failed }.
 */
export async function uploadManifest(filePath, baseUrl, adminKey, { quiet = false } = {}) {
  const headers = makeHeaders(adminKey);
  const resolved = resolve(filePath);
  const name = basename(resolved);

  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const data = JSON.parse(readFileSync(resolved, 'utf8'));
  const { feeds = [], cards = [], forks = [] } = data;

  if (feeds.length === 0 && cards.length === 0 && forks.length === 0) {
    if (!quiet) console.log(`  Skipping ${name} (empty)`);
    return { created: 0, updated: 0, skipped: 0, failed: 0 };
  }

  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const log = quiet ? () => {} : (msg) => console.log(msg);

  // Upload feeds
  for (const feed of feeds) {
    const id = feed._id || feed.id;
    const payload = { ...feed, id, _id: undefined };
    const { status, body } = await post(baseUrl, '/admin/feeds', payload, headers);
    if (status === 201) {
      log(`    ✓ feed ${id}`);
      stats.created++;
    } else if (status === 409) {
      const { status: putStatus } = await put(baseUrl, `/admin/feeds/${id}`, payload, headers);
      if (putStatus === 200) {
        log(`    ↻ feed ${id}`);
        stats.updated++;
      } else {
        log(`    · feed ${id} (update failed: ${putStatus})`);
        stats.skipped++;
      }
    } else {
      log(`    ✗ feed ${id} - ${status}: ${JSON.stringify(body)}`);
      stats.failed++;
    }
  }

  // Upload forks
  for (const fork of forks) {
    const id = fork._id || fork.id;
    const payload = { ...fork, id, _id: undefined };
    const { status, body } = await post(baseUrl, '/admin/forks', payload, headers);
    if (status === 201) {
      log(`    ✓ fork ${id}`);
      stats.created++;
    } else if (status === 409) {
      const { status: putStatus } = await put(baseUrl, `/admin/forks/${id}`, payload, headers);
      if (putStatus === 200) {
        log(`    ↻ fork ${id}`);
        stats.updated++;
      } else {
        log(`    · fork ${id} (update failed: ${putStatus})`);
        stats.skipped++;
      }
    } else {
      log(`    ✗ fork ${id} - ${status}: ${JSON.stringify(body)}`);
      stats.failed++;
    }
  }

  // Clear old cards per feed, then upload new cards
  const feedIdsInFile = new Set(cards.map((c) => c.feedId || c.feed_id).filter(Boolean));
  for (const feedId of feedIdsInFile) {
    try {
      await fetch(`${baseUrl}/admin/feeds/${feedId}/cards`, { method: 'DELETE', headers });
    } catch { /* continue */ }
  }

  for (const card of cards) {
    const id = card._id || card.id;
    const payload = { ...card, id, _id: undefined };
    const { status, body } = await post(baseUrl, '/admin/cards', payload, headers);
    if (status === 201) {
      stats.created++;
    } else if (status === 409) {
      const { status: putStatus } = await put(baseUrl, `/admin/cards/${id}`, payload, headers);
      if (putStatus === 200) {
        stats.updated++;
      } else {
        stats.skipped++;
      }
    } else {
      log(`    ✗ card ${id} - ${status}: ${JSON.stringify(body)}`);
      stats.failed++;
    }
  }

  return stats;
}

// ── Verify manifest endpoint ────────────────────────────────

export async function verifyManifest(baseUrl, readKey) {
  const res = await fetch(`${baseUrl}/.well-known/forkfeed.json`, {
    headers: { 'Authorization': `Bearer ${readKey}` },
  });
  return await res.json();
}
