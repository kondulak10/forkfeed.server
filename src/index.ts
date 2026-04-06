import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  getSettings, upsertSettings,
  getAllFeeds, getFeed, createFeed, updateFeed, deleteFeed,
  getCard, getCardsPaginated, getCardsByFeedId, createCard, updateCard, deleteCard, deleteCardsByFeedId,
  getAllForks, getFork, createFork, updateFork, deleteFork,
  getCardCounts, getStats, safeJsonParse,
  type DbSettings,
} from './db.js';
import { getGenerator } from './registry.js';
import './generators/counting-sheep.js';
import { writeEngagementBatch, getEngagementStats, type EngagementPayload } from './engagement.js';
import type { MiddlewareHandler } from 'hono';

// ── Types ────────────────────────────────────────────────────────

type Bindings = {
  DB: D1Database;
  ADMIN_KEY: string;
  READ_KEY: string;
  ALLOWED_ORIGINS?: string;
  APP_SERVER_URL?: string;
};

type AppEnv = { Bindings: Bindings };

/** Safely parse a card's variants JSON string, falling back to empty array */
function parseVariants(raw: string): unknown[] {
  return safeJsonParse(raw, []);
}

// ── Card variant validation ──────────────────────────────────────

const VALID_SIZING = new Set(['automatic', 'wide', 'portrait', 'square', 'small_portrait']);

/** Validate variant blocks. Returns an error string or null if valid. */
function validateVariants(variants: unknown[]): string | null {
  for (let vi = 0; vi < variants.length; vi++) {
    const variant = variants[vi] as Record<string, unknown>;
    if (variant.type === 'FULL_IMAGE' && !variant.imageSrc) {
      return `variants[${vi}]: FULL_IMAGE requires imageSrc`;
    }
    if (variant.type !== 'CONTENT') continue;
    const blocks = variant.blocks;
    if (!Array.isArray(blocks)) continue;
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi] as Record<string, unknown>;
      if (block.type === 'CONTENT_IMAGE') {
        if (!block.sizing || !VALID_SIZING.has(block.sizing as string)) {
          return `variants[${vi}].blocks[${bi}]: CONTENT_IMAGE requires "sizing" (one of: ${[...VALID_SIZING].join(', ')})`;
        }
      }
      if (block.type === 'CONTENT_QUIZ') {
        const opts = block.options;
        if (!Array.isArray(opts) || opts.length < 2) {
          return `variants[${vi}].blocks[${bi}]: CONTENT_QUIZ requires >= 2 options`;
        }
        if (!opts.some((o: { correct?: boolean }) => o.correct === true)) {
          return `variants[${vi}].blocks[${bi}]: CONTENT_QUIZ must have at least one correct option`;
        }
      }
      if (block.type === 'CONTENT_BUTTON') {
        if (!block.label || !block.action || !block.target) {
          return `variants[${vi}].blocks[${bi}]: CONTENT_BUTTON requires label, action, and target`;
        }
      }
    }
  }
  return null;
}

const app = new Hono<AppEnv>();

// ── Helpers ──────────────────────────────────────────────────────

/** Constant-time string comparison (Cloudflare Workers lack crypto.timingSafeEqual) */
function timingSafeEqual(a: string, b: string): boolean {
  const encA = new TextEncoder().encode(a);
  const encB = new TextEncoder().encode(b);
  const maxLen = Math.max(encA.length, encB.length);
  let result = encA.length ^ encB.length;
  for (let i = 0; i < maxLen; i++) {
    result |= (encA[i] ?? 0) ^ (encB[i] ?? 0);
  }
  return result === 0;
}

// ── Middleware ────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS
    ? c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : undefined;
  return cors({ origin: origins ?? '*' })(c, next);
});

// Admin auth middleware
const adminAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.req.header('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !timingSafeEqual(token, String(c.env.ADMIN_KEY).trim())) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

// Read auth middleware
const readAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.req.header('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !timingSafeEqual(token, String(c.env.READ_KEY).trim())) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

// ── Public routes ────────────────────────────────────────────────

// Health check
app.get('/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ status: 'ok' });
  } catch {
    return c.json({ status: 'degraded' }, 500);
  }
});

// Manifest
app.get('/.well-known/forkfeed.json', readAuth, async (c) => {
  try {
    const [settings, feeds, forks, cardCounts] = await Promise.all([
      getSettings(c.env.DB),
      getAllFeeds(c.env.DB),
      getAllForks(c.env.DB),
      getCardCounts(c.env.DB),
    ]);

    // Filter to only feeds assigned to at least one fork
    const assignedFeedIds = new Set(forks.flatMap((f) => f.feedIds));
    const assignedFeeds = feeds.filter((s) => assignedFeedIds.has(s.id));

    const manifest = {
      protocol: 'forkfeed-v1',
      name: settings?.name || 'Card Server',
      description: settings?.description || 'A forkfeed protocol content server',
      version: settings?.version || '1.0.0',
      maintainer: {
        name: settings?.maintainerName || 'Unknown',
        ...(settings?.maintainerUrl && { url: settings.maintainerUrl }),
        ...(settings?.maintainerEmail && { email: settings.maintainerEmail }),
      },
      maxPageSize: settings?.maxPageSize || 50,
      feeds: assignedFeeds.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        imageSrc: s.imageSrc,
        mode: s.mode,
        scrollDirection: s.scrollDirection,
        engagement: s.engagement,
        cardCount: s.generatorId ? null : (cardCounts.get(s.id) || 0),
        ...(s.generatorId && { generatorId: s.generatorId }),
      })),
      forks: forks.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        imageSrc: f.imageSrc,
        feedIds: f.feedIds,
        ...(f.actionLabel && f.actionUrl && { actionLabel: f.actionLabel, actionUrl: f.actionUrl }),
      })),
    };

    return c.json(manifest);
  } catch (err) {
    console.error('Manifest error:', err);
    return c.json({ error: 'Failed to generate manifest' }, 500);
  }
});

// Shared helper: fetch cards for a feed (used by both GET and POST)
async function fetchFeedCards(
  db: D1Database,
  feedId: string,
  page: number,
  limit: number,
  mode: 'sequential' | 'random',
): Promise<{ ok: true; body: unknown } | { ok: false; body: unknown; status: 400 | 404 | 500 }> {
  const settings = await getSettings(db);
  const maxPageSize = settings?.maxPageSize || 50;
  const clampedLimit = Math.min(limit, maxPageSize);

  const feed = await getFeed(db, feedId);
  if (!feed) {
    return { ok: false, body: { error: `Feed '${feedId}' not found` }, status: 404 };
  }

  if (feed.generatorId) {
    const generator = getGenerator(feed.generatorId);
    if (!generator) {
      return { ok: false, body: { error: `Generator '${feed.generatorId}' not registered` }, status: 500 };
    }
    const effectivePage = mode === 'random' ? Math.floor(Math.random() * 100000) + 1 : page;
    const result = generator(feedId, effectivePage, clampedLimit);
    return {
      ok: true,
      body: {
        cards: result.cards,
        pagination: { page: effectivePage, limit: clampedLimit, totalCards: null, totalPages: null, hasMore: result.hasMore },
        meta: { feedId, mode, generative: true },
      },
    };
  }

  if (feed.mode !== mode) {
    return {
      ok: false,
      body: { error: `Mode '${mode}' is not supported by feed '${feedId}'. Feed mode: ${feed.mode}` },
      status: 400,
    };
  }

  const { cards, total } = await getCardsPaginated(db, feedId, page, clampedLimit, mode);
  const formattedCards = cards.map((card) => ({ id: card.id, variants: parseVariants(card.variants) }));

  return {
    ok: true,
    body: {
      cards: formattedCards,
      pagination: {
        page,
        limit: clampedLimit,
        totalCards: total,
        totalPages: Math.ceil(total / clampedLimit),
        hasMore: mode === 'sequential' ? page * clampedLimit < total : false,
      },
      meta: { feedId, mode },
    },
  };
}

/** Parse page/limit/mode query params from a request */
function parseCardQueryParams(req: { query: (key: string) => string | undefined }) {
  const page = Math.max(1, parseInt(req.query('page') || '1') || 1);
  const requestedLimit = Math.max(1, parseInt(req.query('limit') || '10') || 10);
  const rawMode = req.query('mode') || 'sequential';
  const mode: 'sequential' | 'random' =
    rawMode === 'sequential' || rawMode === 'random' ? rawMode : 'sequential';
  return { page, limit: requestedLimit, mode };
}

// Feed cards — GET (backwards-compatible, no engagement)
app.get('/feeds/:feedId/cards', readAuth, async (c) => {
  try {
    const feedId = c.req.param('feedId');
    const { page, limit, mode } = parseCardQueryParams(c.req);
    const result = await fetchFeedCards(c.env.DB, feedId, page, limit, mode);
    return result.ok ? c.json(result.body) : c.json(result.body, result.status);
  } catch (err) {
    console.error('Cards list error:', err);
    return c.json({ error: 'Failed to fetch cards' }, 500);
  }
});

// Feed cards — POST (with engagement data)
app.post('/feeds/:feedId/cards', readAuth, async (c) => {
  try {
    const feedId = c.req.param('feedId');
    const { page, limit, mode } = parseCardQueryParams(c.req);

    // Parse engagement payload from body
    const body = await c.req.json<EngagementPayload>().catch((err) => {
      console.warn('Engagement body parse failed:', err);
      return {} as EngagementPayload;
    });
    const { sessionId, hashedUserId, engagement } = body;

    // Write engagement asynchronously (non-blocking), with validation
    const feed = await getFeed(c.env.DB, feedId);
    if (feed?.engagement && sessionId && engagement && engagement.length > 0) {
      const MAX_BATCH = 50;
      const MAX_STR_LEN = 128;

      const safeSessionId = typeof sessionId === 'string' ? sessionId.slice(0, MAX_STR_LEN) : '';
      const safeHashedUserId = typeof hashedUserId === 'string' ? hashedUserId.slice(0, MAX_STR_LEN) : null;
      const safeEngagement = (Array.isArray(engagement) ? engagement : [])
        .slice(0, MAX_BATCH)
        .filter((e) => e && typeof e.cardId === 'string' && e.cardId.length > 0);

      if (safeSessionId && safeEngagement.length > 0) {
        c.executionCtx.waitUntil(
          writeEngagementBatch(
            c.env.DB,
            safeEngagement.map((e) => ({
              sessionId: safeSessionId,
              hashedUserId: safeHashedUserId,
              feedId,
              cardId: String(e.cardId).slice(0, 256),
              timeSpentMs: Math.max(0, Math.min(Number(e.timeSpentMs) || 0, 3_600_000)),
              variantViewCount: Math.max(1, Math.min(Number(e.variantViewCount) || 1, 100)),
              pageNumber: page,
            })),
          ).catch((err) => console.error('Engagement write error:', err)),
        );
      }
    }

    const result = await fetchFeedCards(c.env.DB, feedId, page, limit, mode);
    return result.ok ? c.json(result.body) : c.json(result.body, result.status);
  } catch (err) {
    console.error('Cards list error:', err);
    return c.json({ error: 'Failed to fetch cards' }, 500);
  }
});

// Single card
app.get('/cards/:cardId', readAuth, async (c) => {
  try {
    const cardId = c.req.param('cardId');

    const card = await getCard(c.env.DB, cardId);
    if (!card) {
      return c.json({ error: `Card '${cardId}' not found` }, 404);
    }
    return c.json({ id: card.id, variants: parseVariants(card.variants) });
  } catch (err) {
    console.error('Card detail error:', err);
    return c.json({ error: 'Failed to fetch card' }, 500);
  }
});

// ── Authenticated push (ff_ token verified via app server) ──────

const MAX_PUSH_CARDS = 200;

app.post('/push', async (c) => {
  const auth = c.req.header('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const appServerUrl = c.env.APP_SERVER_URL;
  if (!appServerUrl) return c.json({ error: 'Push not configured (missing APP_SERVER_URL)' }, 503);

  // Verify ff_ token with app server
  try {
    const verifyRes = await fetch(`${appServerUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!verifyRes.ok) return c.json({ error: 'Unauthorized' }, 401);
  } catch {
    return c.json({ error: 'Auth service unavailable' }, 503);
  }

  try {
    const { feeds = [], forks = [], cards = [] } = await c.req.json();

    if (cards.length > MAX_PUSH_CARDS) {
      return c.json({ error: `Too many cards (max ${MAX_PUSH_CARDS})` }, 400);
    }

    // Validate feeds
    for (const feed of feeds) {
      const id = feed._id || feed.id;
      if (!id || typeof id !== 'string') return c.json({ error: 'Feed missing _id' }, 400);
      if (!feed.title) return c.json({ error: `Feed "${id}": title required` }, 400);
      if (feed.title.length > 120) return c.json({ error: `Feed "${id}": title max 120 chars` }, 400);
      if (feed.mode && !['sequential', 'random'].includes(feed.mode)) {
        return c.json({ error: `Feed "${id}": mode must be sequential or random` }, 400);
      }
      if (feed.scrollDirection && !['vertical', 'horizontal'].includes(feed.scrollDirection)) {
        return c.json({ error: `Feed "${id}": scrollDirection must be vertical or horizontal` }, 400);
      }
    }

    // Validate forks
    for (const fork of forks) {
      const id = fork._id || fork.id;
      if (!id || typeof id !== 'string') return c.json({ error: 'Fork missing _id' }, 400);
      if (!fork.title) return c.json({ error: `Fork "${id}": title required` }, 400);
      if (!Array.isArray(fork.feedIds) || fork.feedIds.length === 0) {
        return c.json({ error: `Fork "${id}": feedIds required (non-empty array)` }, 400);
      }
    }

    // Validate cards (cross-ref only checked when feeds are in the same push;
    // cards referencing pre-existing feeds in DB are allowed through)
    const pushFeedIds = new Set(feeds.map((f: { _id?: string; id?: string }) => f._id || f.id));
    for (const card of cards) {
      const cardId = card._id || card.id;
      if (!cardId) return c.json({ error: 'Card missing _id' }, 400);
      if (!card.feedId) return c.json({ error: `Card "${cardId}": feedId required` }, 400);
      if (pushFeedIds.size > 0 && !pushFeedIds.has(card.feedId)) {
        return c.json({ error: `Card "${cardId}": feedId "${card.feedId}" not in pushed feeds` }, 400);
      }
      const variants = Array.isArray(card.variants) ? card.variants : [];
      const err = validateVariants(variants);
      if (err) return c.json({ error: `Card "${cardId}": ${err}` }, 400);
    }

    const now = new Date().toISOString();
    const db = c.env.DB;
    const stmts: D1PreparedStatement[] = [];

    // Upsert feeds
    for (const feed of feeds) {
      const id = feed._id || feed.id;
      if (!id) continue;
      stmts.push(
        db.prepare(
          `INSERT INTO feeds (id, title, description, image_src, supported_modes, scroll_direction, generator_id, engagement, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
           ON CONFLICT(id) DO UPDATE SET
             title = ?2, description = ?3, image_src = ?4, supported_modes = ?5,
             scroll_direction = ?6, generator_id = ?7, engagement = ?8, updated_at = ?9`
        ).bind(
          id,
          feed.title || '',
          feed.description || '',
          feed.imageSrc || '',
          JSON.stringify([feed.mode || 'sequential']),
          feed.scrollDirection || 'vertical',
          feed.generatorId || null,
          feed.engagement ? 1 : 0,
          now,
        ),
      );
    }

    // Upsert forks
    for (const fork of forks) {
      const id = fork._id || fork.id;
      if (!id) continue;
      stmts.push(
        db.prepare(
          `INSERT INTO forks (id, title, description, image_src, feed_ids, action_label, action_url, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
           ON CONFLICT(id) DO UPDATE SET
             title = ?2, description = ?3, image_src = ?4, feed_ids = ?5,
             action_label = ?6, action_url = ?7, updated_at = ?8`
        ).bind(
          id,
          fork.title || '',
          fork.description || '',
          fork.imageSrc || '',
          JSON.stringify(fork.feedIds || []),
          fork.actionLabel || null,
          fork.actionUrl || null,
          now,
        ),
      );
    }

    // Delete old cards for affected feeds, then insert new cards
    const feedIdsInCards = new Set(
      cards.map((card: { feedId?: string }) => card.feedId).filter(Boolean),
    );
    for (const feedId of feedIdsInCards) {
      stmts.push(db.prepare('DELETE FROM cards WHERE feed_id = ?1').bind(feedId));
    }
    for (const card of cards) {
      const id = card._id || card.id;
      if (!id) continue;
      stmts.push(
        db.prepare(
          `INSERT INTO cards (id, feed_id, "order", variants, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?5)`
        ).bind(
          id,
          card.feedId || '',
          card.order ?? 0,
          typeof card.variants === 'string' ? card.variants : JSON.stringify(card.variants || []),
          now,
        ),
      );
    }

    // D1 supports ~100 statements per batch; chunk if needed
    for (let i = 0; i < stmts.length; i += 100) {
      await db.batch(stmts.slice(i, i + 100));
    }

    return c.json({ ok: true, feeds: feeds.length, forks: forks.length, cards: cards.length }, 201);
  } catch (err) {
    console.error('Push error:', err);
    return c.json({ error: 'Push failed' }, 500);
  }
});

// ── Admin write routes ───────────────────────────────────────────

// Settings
app.put('/admin/settings', adminAuth, async (c) => {
  try {
    const body = await c.req.json<DbSettings>();
    if (!body.name) return c.json({ error: 'Missing required field: name' }, 400);
    if (!body.description) return c.json({ error: 'Missing required field: description' }, 400);
    if (!body.version) return c.json({ error: 'Missing required field: version' }, 400);
    if (!body.maintainerName) return c.json({ error: 'Missing required field: maintainerName' }, 400);
    const result = await upsertSettings(c.env.DB, body);
    return c.json(result);
  } catch (err) {
    console.error('Settings update error:', err);
    return c.json({ error: 'Failed to update settings' }, 400);
  }
});

// Feeds CRUD
app.post('/admin/feeds', adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const id = body._id || body.id;
    if (!id) return c.json({ error: 'Missing id' }, 400);
    if (!body.title) return c.json({ error: 'Missing required field: title' }, 400);
    if (!body.description) return c.json({ error: 'Missing required field: description' }, 400);
    if (!body.imageSrc) return c.json({ error: 'Missing required field: imageSrc' }, 400);
    if (!body.mode || (body.mode !== 'sequential' && body.mode !== 'random')) {
      return c.json({ error: 'Missing or invalid required field: mode (must be "sequential" or "random")' }, 400);
    }

    const feed = await createFeed(c.env.DB, {
      id,
      title: body.title,
      description: body.description,
      imageSrc: body.imageSrc,
      mode: body.mode,
      scrollDirection: body.scrollDirection === 'horizontal' ? 'horizontal' : 'vertical',
      engagement: body.engagement === true,
      generatorId: body.generatorId || null,
    });
    return c.json(feed, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      return c.json({ error: 'A feed with this ID already exists' }, 409);
    }
    console.error('Feed create error:', err);
    return c.json({ error: 'Failed to create feed' }, 400);
  }
});

app.put('/admin/feeds/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    if (body.mode !== undefined && body.mode !== 'sequential' && body.mode !== 'random') {
      return c.json({ error: 'Invalid field: mode (must be "sequential" or "random")' }, 400);
    }
    const updated = await updateFeed(c.env.DB, id, {
      title: body.title,
      description: body.description,
      imageSrc: body.imageSrc,
      mode: body.mode,
      scrollDirection: body.scrollDirection !== undefined
        ? (body.scrollDirection === 'horizontal' ? 'horizontal' : 'vertical')
        : undefined,
      engagement: body.engagement,
      generatorId: body.generatorId,
    });
    if (!updated) {
      // Maybe it doesn't exist
      const existing = await getFeed(c.env.DB, id);
      if (!existing) return c.json({ error: 'Not found' }, 404);
    }
    const feed = await getFeed(c.env.DB, id);
    if (!feed) return c.json({ error: 'Not found' }, 404);
    return c.json(feed);
  } catch (err) {
    console.error('Feed update error:', err);
    return c.json({ error: 'Failed to update feed' }, 400);
  }
});

app.delete('/admin/feeds/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const deleted = await deleteFeed(c.env.DB, id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    console.error('Feed delete error:', err);
    return c.json({ error: 'Failed to delete feed' }, 500);
  }
});

// Cards CRUD
app.post('/admin/cards', adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const id = body._id || body.id;
    if (!id) return c.json({ error: 'Missing id' }, 400);
    if (!body.feedId) return c.json({ error: 'Missing required field: feedId' }, 400);
    if (!body.variants) return c.json({ error: 'Missing required field: variants' }, 400);

    const variantsArray = Array.isArray(body.variants) ? body.variants : safeJsonParse(body.variants, []);
    const variantError = validateVariants(variantsArray);
    if (variantError) return c.json({ error: variantError }, 400);

    const card = await createCard(c.env.DB, {
      id,
      feedId: body.feedId,
      order: body.order ?? 0,
      variants: typeof body.variants === 'string' ? body.variants : JSON.stringify(body.variants),
    });
    return c.json({ ...card, variants: parseVariants(card.variants) }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      return c.json({ error: 'A card with this ID already exists' }, 409);
    }
    console.error('Card create error:', err);
    return c.json({ error: 'Failed to create card' }, 400);
  }
});

app.put('/admin/cards/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const fields: Partial<{ feedId: string; order: number; variants: string }> = {};
    if (body.feedId !== undefined) fields.feedId = body.feedId;
    if (body.order !== undefined) fields.order = body.order;
    if (body.variants !== undefined) {
      const variantsArray = Array.isArray(body.variants) ? body.variants : safeJsonParse(body.variants, []);
      const variantError = validateVariants(variantsArray);
      if (variantError) return c.json({ error: variantError }, 400);
      fields.variants = typeof body.variants === 'string' ? body.variants : JSON.stringify(body.variants);
    }

    const updated = await updateCard(c.env.DB, id, fields);
    if (!updated) {
      const existing = await getCard(c.env.DB, id);
      if (!existing) return c.json({ error: 'Not found' }, 404);
    }
    const card = await getCard(c.env.DB, id);
    if (!card) return c.json({ error: 'Not found' }, 404);
    return c.json({ ...card, variants: parseVariants(card.variants) });
  } catch (err) {
    console.error('Card update error:', err);
    return c.json({ error: 'Failed to update card' }, 400);
  }
});

app.delete('/admin/cards/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const deleted = await deleteCard(c.env.DB, id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    console.error('Card delete error:', err);
    return c.json({ error: 'Failed to delete card' }, 500);
  }
});

// Delete all cards for a feed (used before re-uploading to prevent duplicates)
app.delete('/admin/feeds/:feedId/cards', adminAuth, async (c) => {
  try {
    const feedId = c.req.param('feedId');
    const deleted = await deleteCardsByFeedId(c.env.DB, feedId);
    return c.json({ success: true, deleted });
  } catch (err) {
    console.error('Cards bulk delete error:', err);
    return c.json({ error: 'Failed to delete cards' }, 500);
  }
});

// Forks CRUD
app.post('/admin/forks', adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const id = body._id || body.id;
    if (!id) return c.json({ error: 'Missing id' }, 400);
    if (!body.title) return c.json({ error: 'Missing required field: title' }, 400);
    if (!body.description) return c.json({ error: 'Missing required field: description' }, 400);
    if (!body.imageSrc) return c.json({ error: 'Missing required field: imageSrc' }, 400);

    const fork = await createFork(c.env.DB, {
      id,
      title: body.title,
      description: body.description,
      imageSrc: body.imageSrc,
      feedIds: body.feedIds || [],
      actionLabel: body.actionLabel || null,
      actionUrl: body.actionUrl || null,
    });
    return c.json(fork, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      return c.json({ error: 'A fork with this ID already exists' }, 409);
    }
    console.error('Fork create error:', err);
    return c.json({ error: 'Failed to create fork' }, 400);
  }
});

app.put('/admin/forks/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updated = await updateFork(c.env.DB, id, {
      title: body.title,
      description: body.description,
      imageSrc: body.imageSrc,
      feedIds: body.feedIds,
      actionLabel: body.actionLabel,
      actionUrl: body.actionUrl,
    });
    if (!updated) {
      const existing = await getFork(c.env.DB, id);
      if (!existing) return c.json({ error: 'Not found' }, 404);
    }
    const fork = await getFork(c.env.DB, id);
    if (!fork) return c.json({ error: 'Not found' }, 404);
    return c.json(fork);
  } catch (err) {
    console.error('Fork update error:', err);
    return c.json({ error: 'Failed to update fork' }, 400);
  }
});

app.delete('/admin/forks/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const deleted = await deleteFork(c.env.DB, id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    console.error('Fork delete error:', err);
    return c.json({ error: 'Failed to delete fork' }, 500);
  }
});

// ── Admin read-only routes ───────────────────────────────────────

app.get('/admin/stats', adminAuth, async (c) => {
  try {
    const stats = await getStats(c.env.DB);
    return c.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

app.get('/admin/feeds', adminAuth, async (c) => {
  try {
    const feeds = await getAllFeeds(c.env.DB);
    const cardCounts = await getCardCounts(c.env.DB);
    return c.json(
      feeds.map((s) => ({
        ...s,
        cardCount: cardCounts.get(s.id) || 0,
      }))
    );
  } catch (err) {
    console.error('Feeds list error:', err);
    return c.json({ error: 'Failed to fetch feeds' }, 500);
  }
});

app.get('/admin/cards', adminAuth, async (c) => {
  try {
    const feedId = c.req.query('feedId');
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
    const limit = Math.max(1, Math.min(parseInt(c.req.query('limit') || '100') || 100, 500));
    const { cards, total } = await getCardsByFeedId(c.env.DB, feedId, page, limit);
    return c.json({
      cards: cards.map((card) => ({ ...card, variants: parseVariants(card.variants) })),
      pagination: { page, limit, totalCards: total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (err) {
    console.error('Cards list error:', err);
    return c.json({ error: 'Failed to fetch cards' }, 500);
  }
});

app.get('/admin/engagement', adminAuth, async (c) => {
  try {
    const feedId = c.req.query('feedId');
    const stats = await getEngagementStats(c.env.DB, feedId || undefined);
    return c.json(stats);
  } catch (err) {
    console.error('Engagement stats error:', err);
    return c.json({ error: 'Failed to fetch engagement stats' }, 500);
  }
});

app.get('/admin/forks', adminAuth, async (c) => {
  try {
    const forks = await getAllForks(c.env.DB);
    return c.json(forks);
  } catch (err) {
    console.error('Forks list error:', err);
    return c.json({ error: 'Failed to fetch forks' }, 500);
  }
});

// ── Export ────────────────────────────────────────────────────────

export default app;
