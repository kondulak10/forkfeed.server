/**
 * D1 query helpers with snake_case ↔ camelCase mapping.
 */

// ── Case conversion ──────────────────────────────────────────────

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert a snake_case DB row to camelCase API object */
export function rowToApi<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}

/** Safely parse JSON with a fallback value */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(`safeJsonParse: failed to parse, using fallback. Raw value: ${String(raw).slice(0, 100)}`);
    return fallback;
  }
}

// ── Settings ─────────────────────────────────────────────────────

export interface DbSettings {
  name: string;
  description: string;
  version: string;
  maintainerName: string;
  maintainerUrl: string | null;
  maintainerEmail: string | null;
  maxPageSize: number;
}

export async function getSettings(db: D1Database): Promise<DbSettings | null> {
  const row = await db.prepare("SELECT * FROM settings WHERE id = 'manifest'").first();
  if (!row) return null;
  return rowToApi<DbSettings>(row as Record<string, unknown>);
}

export async function upsertSettings(db: D1Database, settings: DbSettings): Promise<DbSettings> {
  await db
    .prepare(
      `INSERT INTO settings (id, name, description, version, maintainer_name, maintainer_url, maintainer_email, max_page_size)
       VALUES ('manifest', ?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(id) DO UPDATE SET
         name = ?1, description = ?2, version = ?3, maintainer_name = ?4,
         maintainer_url = ?5, maintainer_email = ?6, max_page_size = ?7`
    )
    .bind(
      settings.name,
      settings.description,
      settings.version,
      settings.maintainerName,
      settings.maintainerUrl,
      settings.maintainerEmail,
      settings.maxPageSize
    )
    .run();
  return settings;
}

// ── Feeds ─────────────────────────────────────────────────────

export interface DbFeed {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  mode: 'sequential' | 'random';
  scrollDirection: 'vertical' | 'horizontal';
  engagement: boolean;
  generatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseFeed(row: Record<string, unknown>): DbFeed {
  const s = rowToApi<Record<string, unknown>>(row);
  const modes = safeJsonParse<string[]>(s.supportedModes as string, ['sequential']);
  const { supportedModes: _, ...rest } = s;
  return {
    ...rest,
    mode: (modes[0] === 'random' ? 'random' : 'sequential') as 'sequential' | 'random',
    scrollDirection: (rest.scrollDirection === 'horizontal' ? 'horizontal' : 'vertical') as 'vertical' | 'horizontal',
    engagement: rest.engagement === 1 || rest.engagement === true,
  } as DbFeed;
}

export async function getAllFeeds(db: D1Database): Promise<DbFeed[]> {
  const { results } = await db.prepare('SELECT * FROM feeds ORDER BY created_at').all();
  return results.map((r) => parseFeed(r as Record<string, unknown>));
}

export async function getFeed(db: D1Database, id: string): Promise<DbFeed | null> {
  const row = await db.prepare('SELECT * FROM feeds WHERE id = ?1').bind(id).first();
  if (!row) return null;
  return parseFeed(row as Record<string, unknown>);
}

export async function createFeed(db: D1Database, feed: Omit<DbFeed, 'createdAt' | 'updatedAt'>): Promise<DbFeed> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO feeds (id, title, description, image_src, supported_modes, scroll_direction, generator_id, engagement, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`
    )
    .bind(
      feed.id,
      feed.title,
      feed.description,
      feed.imageSrc,
      JSON.stringify([feed.mode]),
      feed.scrollDirection || 'vertical',
      feed.generatorId,
      feed.engagement ? 1 : 0,
      now
    )
    .run();
  return { ...feed, createdAt: now, updatedAt: now };
}

export async function updateFeed(
  db: D1Database,
  id: string,
  fields: Partial<Omit<DbFeed, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (fields.title !== undefined) { sets.push(`title = ?${idx++}`); values.push(fields.title); }
  if (fields.description !== undefined) { sets.push(`description = ?${idx++}`); values.push(fields.description); }
  if (fields.imageSrc !== undefined) { sets.push(`image_src = ?${idx++}`); values.push(fields.imageSrc); }
  if (fields.mode !== undefined) { sets.push(`supported_modes = ?${idx++}`); values.push(JSON.stringify([fields.mode])); }
  if (fields.scrollDirection !== undefined) { sets.push(`scroll_direction = ?${idx++}`); values.push(fields.scrollDirection); }
  if (fields.generatorId !== undefined) { sets.push(`generator_id = ?${idx++}`); values.push(fields.generatorId); }
  if (fields.engagement !== undefined) { sets.push(`engagement = ?${idx++}`); values.push(fields.engagement ? 1 : 0); }

  if (sets.length === 0) return false;

  sets.push(`updated_at = ?${idx++}`);
  values.push(new Date().toISOString());
  values.push(id);

  const result = await db
    .prepare(`UPDATE feeds SET ${sets.join(', ')} WHERE id = ?${idx}`)
    .bind(...values)
    .run();
  return result.meta.changes > 0;
}

export async function deleteFeed(db: D1Database, id: string): Promise<boolean> {
  const batch = [
    db.prepare('DELETE FROM cards WHERE feed_id = ?1').bind(id),
    db.prepare('DELETE FROM feeds WHERE id = ?1').bind(id),
  ];
  const results = await db.batch(batch);
  return (results[1].meta.changes ?? 0) > 0;
}

// ── Cards ────────────────────────────────────────────────────────

export interface DbCard {
  id: string;
  feedId: string;
  order: number;
  variants: string; // JSON string in DB, parsed in API layer
  createdAt: string;
  updatedAt: string;
}

function parseCard(row: Record<string, unknown>): DbCard {
  return rowToApi<DbCard>(row);
}

export async function getCard(db: D1Database, id: string): Promise<DbCard | null> {
  const row = await db.prepare('SELECT * FROM cards WHERE id = ?1').bind(id).first();
  if (!row) return null;
  return parseCard(row as Record<string, unknown>);
}

export async function getCardsPaginated(
  db: D1Database,
  feedId: string,
  page: number,
  limit: number,
  mode: 'sequential' | 'random'
): Promise<{ cards: DbCard[]; total: number }> {
  const countRow = await db
    .prepare('SELECT COUNT(*) as cnt FROM cards WHERE feed_id = ?1')
    .bind(feedId)
    .first<{ cnt: number }>();
  const total = countRow?.cnt ?? 0;

  let results;
  if (mode === 'random') {
    const { results: rows } = await db
      .prepare('SELECT * FROM cards WHERE feed_id = ?1 ORDER BY RANDOM() LIMIT ?2')
      .bind(feedId, limit)
      .all();
    results = rows;
  } else {
    const offset = (page - 1) * limit;
    const { results: rows } = await db
      .prepare('SELECT * FROM cards WHERE feed_id = ?1 ORDER BY "order" ASC LIMIT ?2 OFFSET ?3')
      .bind(feedId, limit, offset)
      .all();
    results = rows;
  }

  return {
    cards: results.map((r) => parseCard(r as Record<string, unknown>)),
    total,
  };
}

export async function getCardsByFeedId(
  db: D1Database,
  feedId?: string,
  page = 1,
  limit = 100,
): Promise<{ cards: DbCard[]; total: number }> {
  const offset = (page - 1) * limit;

  if (feedId) {
    const countRow = await db
      .prepare('SELECT COUNT(*) as cnt FROM cards WHERE feed_id = ?1')
      .bind(feedId)
      .first<{ cnt: number }>();
    const total = countRow?.cnt ?? 0;
    const { results } = await db
      .prepare('SELECT * FROM cards WHERE feed_id = ?1 ORDER BY "order" ASC LIMIT ?2 OFFSET ?3')
      .bind(feedId, limit, offset)
      .all();
    return { cards: results.map((r) => parseCard(r as Record<string, unknown>)), total };
  }

  const countRow = await db
    .prepare('SELECT COUNT(*) as cnt FROM cards')
    .first<{ cnt: number }>();
  const total = countRow?.cnt ?? 0;
  const { results } = await db
    .prepare('SELECT * FROM cards ORDER BY created_at DESC LIMIT ?1 OFFSET ?2')
    .bind(limit, offset)
    .all();
  return { cards: results.map((r) => parseCard(r as Record<string, unknown>)), total };
}

export async function createCard(db: D1Database, card: Omit<DbCard, 'createdAt' | 'updatedAt'>): Promise<DbCard> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO cards (id, feed_id, "order", variants, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)`
    )
    .bind(card.id, card.feedId, card.order, card.variants, now)
    .run();
  return { ...card, createdAt: now, updatedAt: now };
}

export async function updateCard(
  db: D1Database,
  id: string,
  fields: Partial<Omit<DbCard, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (fields.feedId !== undefined) { sets.push(`feed_id = ?${idx++}`); values.push(fields.feedId); }
  if (fields.order !== undefined) { sets.push(`"order" = ?${idx++}`); values.push(fields.order); }
  if (fields.variants !== undefined) { sets.push(`variants = ?${idx++}`); values.push(fields.variants); }

  if (sets.length === 0) return false;

  sets.push(`updated_at = ?${idx++}`);
  values.push(new Date().toISOString());
  values.push(id);

  const result = await db
    .prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?${idx}`)
    .bind(...values)
    .run();
  return result.meta.changes > 0;
}

export async function deleteCard(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM cards WHERE id = ?1').bind(id).run();
  return result.meta.changes > 0;
}

export async function deleteCardsByFeedId(db: D1Database, feedId: string): Promise<number> {
  const result = await db.prepare('DELETE FROM cards WHERE feed_id = ?1').bind(feedId).run();
  return result.meta.changes ?? 0;
}

// ── Card counts per feed (batched) ────────────────────────────

export async function getCardCounts(db: D1Database): Promise<Map<string, number>> {
  const { results } = await db
    .prepare('SELECT feed_id, COUNT(*) as cnt FROM cards GROUP BY feed_id')
    .all<{ feed_id: string; cnt: number }>();
  return new Map(results.map((r) => [r.feed_id, r.cnt]));
}

// ── Forks ────────────────────────────────────────────────────────

export interface DbFork {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  feedIds: string[];
  actionLabel?: string | null;
  actionUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseFork(row: Record<string, unknown>): DbFork {
  const f = rowToApi<Record<string, unknown>>(row);
  return {
    ...f,
    feedIds: safeJsonParse<string[]>(f.feedIds as string, []),
  } as DbFork;
}

export async function getAllForks(db: D1Database): Promise<DbFork[]> {
  const { results } = await db.prepare('SELECT * FROM forks ORDER BY created_at').all();
  return results.map((r) => parseFork(r as Record<string, unknown>));
}

export async function getFork(db: D1Database, id: string): Promise<DbFork | null> {
  const row = await db.prepare('SELECT * FROM forks WHERE id = ?1').bind(id).first();
  if (!row) return null;
  return parseFork(row as Record<string, unknown>);
}

export async function createFork(db: D1Database, fork: Omit<DbFork, 'createdAt' | 'updatedAt'>): Promise<DbFork> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO forks (id, title, description, image_src, feed_ids, action_label, action_url, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)`
    )
    .bind(
      fork.id,
      fork.title,
      fork.description,
      fork.imageSrc,
      JSON.stringify(fork.feedIds),
      fork.actionLabel || null,
      fork.actionUrl || null,
      now
    )
    .run();
  return { ...fork, createdAt: now, updatedAt: now };
}

export async function updateFork(
  db: D1Database,
  id: string,
  fields: Partial<Omit<DbFork, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (fields.title !== undefined) { sets.push(`title = ?${idx++}`); values.push(fields.title); }
  if (fields.description !== undefined) { sets.push(`description = ?${idx++}`); values.push(fields.description); }
  if (fields.imageSrc !== undefined) { sets.push(`image_src = ?${idx++}`); values.push(fields.imageSrc); }
  if (fields.feedIds !== undefined) { sets.push(`feed_ids = ?${idx++}`); values.push(JSON.stringify(fields.feedIds)); }
  if (fields.actionLabel !== undefined) { sets.push(`action_label = ?${idx++}`); values.push(fields.actionLabel); }
  if (fields.actionUrl !== undefined) { sets.push(`action_url = ?${idx++}`); values.push(fields.actionUrl); }

  if (sets.length === 0) return false;

  sets.push(`updated_at = ?${idx++}`);
  values.push(new Date().toISOString());
  values.push(id);

  const result = await db
    .prepare(`UPDATE forks SET ${sets.join(', ')} WHERE id = ?${idx}`)
    .bind(...values)
    .run();
  return result.meta.changes > 0;
}

export async function deleteFork(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM forks WHERE id = ?1').bind(id).run();
  return result.meta.changes > 0;
}

// ── Stats ────────────────────────────────────────────────────────

export async function getStats(db: D1Database): Promise<{ feeds: number; cards: number; forks: number }> {
  const [feedCount, cardCount, forkCount] = await Promise.all([
    db.prepare('SELECT COUNT(*) as cnt FROM feeds').first<{ cnt: number }>(),
    db.prepare('SELECT COUNT(*) as cnt FROM cards').first<{ cnt: number }>(),
    db.prepare('SELECT COUNT(*) as cnt FROM forks').first<{ cnt: number }>(),
  ]);
  return {
    feeds: feedCount?.cnt ?? 0,
    cards: cardCount?.cnt ?? 0,
    forks: forkCount?.cnt ?? 0,
  };
}
