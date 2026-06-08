import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import { FORKS } from '../forks/index.js';
import { isDynamicFeed, type Feed, type Card } from './types.js';

// ── Types ────────────────────────────────────────────────────────

type Bindings = {
  // Default read-access key. Defaults to "read"; a forker can change it
  // per deployment via a wrangler var / secret. No database bindings.
  READ_KEY?: string;
  ALLOWED_ORIGINS?: string;
};

type AppEnv = { Bindings: Bindings };

const DEFAULT_READ_KEY = 'read';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const app = new Hono<AppEnv>();

// ── Helpers ──────────────────────────────────────────────────────

/** Constant-time string comparison (Workers lack crypto.timingSafeEqual). */
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

function findFeed(forkId: string, feedId: string): Feed | undefined {
  return FORKS[forkId]?.feeds.find((f) => f.id === feedId);
}

/** Parse page/limit query params, clamped to sane bounds. */
function parsePaging(req: { query: (key: string) => string | undefined }) {
  const page = Math.max(1, parseInt(req.query('page') || '1') || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query('limit') || String(DEFAULT_LIMIT)) || DEFAULT_LIMIT));
  return { page, limit };
}

// ── Middleware ────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS
    ? c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : undefined;
  return cors({ origin: origins ?? '*' })(c, next);
});

// Read auth: Bearer token matching READ_KEY (default "read").
const readAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.req.header('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const expected = (c.env.READ_KEY ?? DEFAULT_READ_KEY).trim();
  if (!token || !timingSafeEqual(token, expected)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

// ── Routes ────────────────────────────────────────────────────────

// Health check (no auth).
app.get('/health', (c) => c.json({ status: 'ok', forks: Object.keys(FORKS).length }));

// Discovery: list all fork ids on this server (used by `npm run publish` and to
// let the app import every fork from a server at once).
app.get('/forks', readAuth, (c) => {
  return c.json({
    forks: Object.values(FORKS).map((f) => ({
      id: f.meta.id,
      title: f.meta.title,
      feedCount: f.feeds.length,
    })),
  });
});

// Endpoint A: fork metadata + feed summaries.
app.get('/forks/:forkId', readAuth, (c) => {
  const fork = FORKS[c.req.param('forkId')];
  if (!fork) return c.json({ error: 'Fork not found' }, 404);

  return c.json({
    fork: { ...fork.meta },
    feeds: fork.feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      description: feed.description,
      imageSrc: feed.imageSrc,
      mode: feed.mode ?? 'sequential',
      scrollDirection: feed.scrollDirection ?? 'vertical',
      engagement: feed.engagement ?? false,
      dynamic: isDynamicFeed(feed),
      cardCount: isDynamicFeed(feed) ? null : feed.cards.length,
    })),
  });
});

// Endpoint B: a page of cards for a feed.
app.get('/forks/:forkId/feeds/:feedId/cards', readAuth, (c) => {
  const forkId = c.req.param('forkId');
  const feed = findFeed(forkId, c.req.param('feedId'));
  if (!feed) return c.json({ error: 'Feed not found' }, 404);

  const { page, limit } = parsePaging(c.req);

  if (isDynamicFeed(feed)) {
    // The page is the seed: a generator returns the same page for the same page
    // number, giving stable, non-repeating infinite scroll as the client paginates.
    const { cards, hasMore } = feed.generate(page, limit, page);
    return c.json({
      cards,
      pagination: { page, limit, totalCards: null, totalPages: null, hasMore },
      meta: { forkId, feedId: feed.id, dynamic: true },
    });
  }

  const all = feed.cards;
  const start = (page - 1) * limit;
  const cards = all.slice(start, start + limit);
  return c.json({
    cards,
    pagination: {
      page,
      limit,
      totalCards: all.length,
      totalPages: Math.ceil(all.length / limit) || 1,
      hasMore: start + limit < all.length,
    },
    meta: { forkId, feedId: feed.id, dynamic: false },
  });
});

// Optional single-card lookup (static feeds only; dynamic cards are
// page-derived and not addressable by id).
app.get('/forks/:forkId/cards/:cardId', readAuth, (c) => {
  const fork = FORKS[c.req.param('forkId')];
  if (!fork) return c.json({ error: 'Fork not found' }, 404);
  const cardId = c.req.param('cardId');
  for (const feed of fork.feeds) {
    if (isDynamicFeed(feed)) continue;
    const card = feed.cards.find((cd: Card) => cd.id === cardId);
    if (card) return c.json(card);
  }
  return c.json({ error: 'Card not found' }, 404);
});

export default app;
