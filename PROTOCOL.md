# Protocol & API Reference

A lightweight, edge-deployed content backend built on Cloudflare Workers + D1 (SQLite) + Hono.

## Running

```bash
npm install              # Install dependencies
npm run db:create        # Create D1 database (once)
npm run db:migrate       # Run schema migration on remote D1
wrangler secret put ADMIN_KEY  # Set admin auth key
wrangler secret put READ_KEY   # Set read auth key
npm run deploy           # Deploy to Cloudflare Workers
```

### Environment / Secrets

| Variable | Required | Description |
|---|---|---|
| `ADMIN_KEY` | Yes | Bearer token for admin API (set via `wrangler secret put`) |
| `READ_KEY` | Yes | Bearer token for read endpoints (set via `wrangler secret put`) |

D1 database binding is configured in `wrangler.toml`.

---

## Data Model

### Settings (Manifest)

Single row (`id = 'manifest'`) containing server-wide configuration.

| Field | Type | Required |
|---|---|---|
| `name` | `string` | Yes |
| `description` | `string` | Yes |
| `version` | `string` | Yes (semver) |
| `maintainerName` | `string` | Yes |
| `maintainerUrl` | `string` | No |
| `maintainerEmail` | `string` | No |
| `maxPageSize` | `integer` | Yes (default 50) |

### Feed

A named collection of cards with one or more supported loading modes.

| Field | Type | Required |
|---|---|---|
| `id` | `string` | Yes |
| `title` | `string` | Yes |
| `description` | `string` | Yes |
| `imageSrc` | `string` | Yes |
| `mode` | `string` | Yes (`"sequential"` or `"random"`) |
| `scrollDirection` | `string` | No (`"vertical"` or `"horizontal"`, default `"vertical"`) |
| `generatorId` | `string` | No (references a registered card generator) |
| `engagement` | `boolean` | No (default `false`) |
| `createdAt` | `string` (ISO 8601) | Auto |
| `updatedAt` | `string` (ISO 8601) | Auto |

### Card

A single piece of content with one or more visual variants.

| Field | Type | Required |
|---|---|---|
| `id` | `string` | Yes |
| `feedId` | `string` | Yes |
| `order` | `integer` | Yes (>= 0) |
| `variants` | `CardVariant[]` | Yes (min 1) |
| `createdAt` | `string` (ISO 8601) | Auto |
| `updatedAt` | `string` (ISO 8601) | Auto |

### Fork

A curated sequence of feeds.

| Field | Type | Required |
|---|---|---|
| `id` | `string` | Yes |
| `title` | `string` | Yes |
| `description` | `string` | Yes |
| `imageSrc` | `string` | Yes |
| `feedIds` | `string[]` | Yes |
| `actionLabel` | `string` | No (button text, e.g. "Buy the Full Book") |
| `actionUrl` | `string` | No (URL opened when the button is tapped) |
| `createdAt` | `string` (ISO 8601) | Auto |
| `updatedAt` | `string` (ISO 8601) | Auto |

### CardVariant Types

`FULL_IMAGE`, `FULL_VIDEO`, `CONTENT`. Both `FULL_IMAGE` and `CONTENT` variants support an optional `backgroundSrc` field. For `CONTENT`, it renders a full-bleed background behind the glass card with a dark overlay. For `FULL_IMAGE`, it enables a two-layer composition: `backgroundSrc` as full-bleed background and `imageSrc` as a contained foreground element (transparent PNGs, product shots, character art). See [CONTENT.md](CONTENT.md) for detailed examples of each type and all content block types.

### ContentBlock Types

`CONTENT_IMAGE`, `CONTENT_TEXT`, `CONTENT_TITLE`, `CONTENT_VIDEO`, `CONTENT_SOCIAL`, `CONTENT_SUBTEXT`, `CONTENT_CODE`, `CONTENT_QUIZ`, `CONTENT_BUTTON`. See [CONTENT.md](CONTENT.md) for JSON examples.

---

## Read Endpoints

All read endpoints (except `/health`) require `Authorization: Bearer <READ_KEY>` header. These are consumed by the app-server.

### `GET /health`

**Response `200`:**
```json
{ "status": "ok" }
```

If D1 is unreachable: `{ "status": "degraded" }` with HTTP 500.

---

### `GET /.well-known/forkfeed.json`

Discovery manifest.

**Response `200`:**
```json
{
  "protocol": "forkfeed-v1",
  "name": "My Card Server",
  "description": "Nature photography cards",
  "version": "1.0.0",
  "maintainer": {
    "name": "Jane Doe",
    "url": "https://example.com",
    "email": "jane@example.com"
  },
  "maxPageSize": 50,
  "feeds": [
    {
      "id": "calming-nature",
      "title": "Calming Nature",
      "description": "Peaceful nature imagery",
      "imageSrc": "https://example.com/cover.jpg",
      "mode": "sequential",
      "scrollDirection": "vertical",
      "engagement": true,
      "cardCount": 42
    }
  ],
  "forks": [
    {
      "id": "nature-fork",
      "title": "Nature Fork",
      "description": "A calming nature experience",
      "imageSrc": "https://example.com/fork.jpg",
      "feedIds": ["calming-nature"],
      "actionLabel": "Visit our website",
      "actionUrl": "https://example.com"
    }
  ]
}
```

Only feeds assigned to at least one fork are included. `cardCount` is `null` for generative feeds. `maintainer.url` and `maintainer.email` are omitted if not configured. `actionLabel` and `actionUrl` are only included when both are set.

---

### `GET /feeds/:feedId/cards`

Paginated card list (backwards-compatible, no engagement).

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | 1-indexed page number |
| `limit` | integer | `10` | Cards per page (clamped to `maxPageSize`) |
| `mode` | `"sequential" \| "random"` | `"sequential"` | Loading mode |

**Response `200`:**
```json
{
  "cards": [
    { "id": "nature-001", "variants": [...] }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCards": 42,
    "totalPages": 5,
    "hasMore": true
  },
  "meta": {
    "feedId": "calming-nature",
    "mode": "sequential"
  }
}
```

- **Sequential mode**: offset pagination, `hasMore = page * limit < totalCards`
- **Random mode**: D1 `ORDER BY RANDOM()`, `hasMore` always `false`
- **Generative feeds**: `totalCards` and `totalPages` are `null`, `meta.generative` is `true`

**Error `404`:** `{ "error": "Feed 'xyz' not found" }`
**Error `400`:** `{ "error": "Mode 'random' is not supported..." }`

---

### `POST /feeds/:feedId/cards` (optional)

Paginated card list **with engagement data**. Only available when the feed declares `"engagement": true`. The app-server checks this during backend registration and uses POST when the feed supports it, GET otherwise.

Same query parameters as GET. Additionally accepts a JSON request body with engagement data from the previous batch of cards.

**Request Body:**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "hashedUserId": "a1b2c3d4e5f6...",
  "engagement": [
    {
      "cardId": "nature-001",
      "timeSpentMs": 4200,
      "variantViewCount": 3
    },
    {
      "cardId": "nature-002",
      "timeSpentMs": 1800,
      "variantViewCount": 1
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `sessionId` | `string` (UUID v4) | Yes | Unique per feed-viewing session, generated by the client |
| `hashedUserId` | `string` (SHA-256 hex) | No | Hash of the user's internal ID for cross-session correlation. `null` for anonymous users |
| `engagement` | `CardEngagement[]` | No | Engagement signals from the previous batch of cards |
| `engagement[].cardId` | `string` | Yes | The card that was viewed |
| `engagement[].timeSpentMs` | `integer` | Yes | Milliseconds the card was visible on screen |
| `engagement[].variantViewCount` | `integer` | Yes | Number of unique variants the user swiped through (min 1) |

**Behavior:**
- Engagement data is written to D1 asynchronously (non-blocking) — it does not affect the card response
- The first page request typically has no engagement data (nothing to report yet)
- If `sessionId` is missing or `engagement` is empty, the endpoint behaves identically to GET
- Feeds that declare `"engagement": true` MUST accept this endpoint
- Card servers MUST handle empty/missing engagement gracefully

**Response:** Identical to `GET /feeds/:feedId/cards`

---

### `GET /cards/:cardId`

Single card by ID. Falls back to generator derivation for generative card IDs.

**Response `200`:**
```json
{ "id": "nature-001", "variants": [...] }
```

**Error `404`:** `{ "error": "Card 'xyz' not found" }`

---

## Admin API Endpoints

All admin endpoints require `Authorization: Bearer <ADMIN_KEY>` header.

### Write

| Method | Path | Notes |
|---|---|---|
| `PUT /admin/settings` | Upsert server settings |
| `POST /admin/feeds` | Create feed (409 if exists) |
| `PUT /admin/feeds/:id` | Update feed |
| `DELETE /admin/feeds/:id` | Delete feed + cascade cards |
| `DELETE /admin/feeds/:feedId/cards` | Delete all cards for a feed (used before re-upload) |
| `POST /admin/cards` | Create card (409 if exists) |
| `PUT /admin/cards/:id` | Update card |
| `DELETE /admin/cards/:id` | Delete card |
| `POST /admin/forks` | Create fork (409 if exists) |
| `PUT /admin/forks/:id` | Update fork |
| `DELETE /admin/forks/:id` | Delete fork |

### Read-Only

| Method | Path | Notes |
|---|---|---|
| `GET /admin/stats` | `{ feeds, cards, forks }` counts |
| `GET /admin/feeds` | All feeds with card counts |
| `GET /admin/cards?feedId=X` | Cards list, filterable by feed |
| `GET /admin/forks` | All forks |
| `GET /admin/engagement?feedId=X` | Engagement stats (total events, unique sessions, avg time, per-feed breakdown) |

---

## Upload Script

```bash
# Push a single manifest
npm run push -- manifests/hp-philosophers-stone.json

# Push all manifests
npm run push
```

The push script sends manifests to the app-server, which forwards to the card server and registers forks automatically. Requires `FORKFEED_TOKEN` in `.dev.vars`.

---

## Generators

Feeds can be backed by a **card generator** instead of stored cards. A generator produces cards on-demand — enabling infinite, procedurally generated content without storing anything in D1.

### How It Works

1. A feed has a `generatorId` field (e.g. `"counting-sheep"`)
2. When `/feeds/:feedId/cards` is requested, the server calls the matching generator instead of querying D1
3. The generator returns a page of cards with `hasMore: true` for infinite pagination

### CardGenerator Type Signature

```typescript
type CardGenerator = (
  feedId: string,
  page: number,
  limit: number,
) => { cards: GeneratedCard[]; hasMore: boolean };
```

Where `GeneratedCard` is `{ id: string; variants: CardVariant[] }`.

### Registering a Generator

Create a file in `src/generators/`, implement the `CardGenerator` interface, call `registerGenerator()`, and import it in `src/index.ts`:

```typescript
import { registerGenerator, type CardGenerator } from '../registry.js';

const myGenerator: CardGenerator = (feedId, page, limit) => {
  const cards = Array.from({ length: limit }, (_, i) => ({
    id: crypto.randomUUID(),
    variants: [{ type: 'FULL_IMAGE', imageSrc: `https://example.com/${page}-${i}.jpg` }],
  }));
  return { cards, hasMore: true };
};

registerGenerator('my-generator', myGenerator);
```

Then create a feed with `generatorId: "my-generator"`.

### Card IDs

All entity IDs (forks, feeds, cards) should be UUID v4. For generative cards, use deterministic UUIDs derived from the seed (page + index) so the same request always returns stable IDs. The app-server treats card IDs as opaque strings and does not attempt to parse or re-derive them.

### Built-in Generator

The `counting-sheep` generator produces an infinite stream of sheep-jumping cards with deterministic rare variants (uncommon, rare, legendary) using Knuth's multiplicative hash.
