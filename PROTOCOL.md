# Protocol & API Reference

A tiny, edge-deployed content server built on Cloudflare Workers + Hono. There is
**no database**: content lives as typed TypeScript files under `forks/` and is
bundled into the worker at build time. Dynamic feeds are functions that ship in the
bundle. The server exposes **two read endpoints** (plus health and an optional
single-card lookup).

## Running

```bash
npm install              # install dependencies
npm run typecheck        # tsc --noEmit (type-checks all content in forks/)
npm run deploy           # deploy to Cloudflare Workers
```

### Environment

| Variable | Required | Description |
|---|---|---|
| `READ_KEY` | No | Bearer token for read endpoints. Defaults to `"read"`. Set in `wrangler.toml` `[vars]` or via `wrangler secret put READ_KEY`. |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins. Defaults to `*`. |

No database binding is needed.

---

## Data Model

Defined as TypeScript in [`src/types.ts`](src/types.ts) — the types ARE the schema,
so authoring mistakes are caught by `npm run typecheck`.

### Fork (`forks/<fork-id>/fork.ts`)

```ts
interface Fork {
  meta: {
    id: string;
    title: string;
    description: string;
    imageSrc: string;
    actionLabel?: string;   // optional CTA button text
    actionUrl?: string;     // optional CTA button URL
  };
  feeds: Feed[];            // ordered
}
```

### Feed (`forks/<fork-id>/<feed-id>.ts`)

Shared metadata:

| Field | Type | Required |
|---|---|---|
| `id` | `string` | Yes |
| `title` | `string` | Yes |
| `description` | `string` | Yes |
| `imageSrc` | `string` | Yes |
| `mode` | `"sequential" \| "random"` | No (default `sequential`) |
| `scrollDirection` | `"vertical" \| "horizontal"` | No (default `vertical`) |
| `engagement` | `boolean` | No (default `false`; tracking is collected by the app-server) |

A **static feed** (`StaticFeed`) additionally has `cards: Card[]`.
A **dynamic feed** (`DynamicFeed`, file suffix `.dynamic.ts`) instead has
`dynamic: true` and `generate(page, limit, seed) => { cards: Card[]; hasMore: boolean }`.

### Card

```ts
interface Card { id: string; variants: CardVariant[]; }
```

### CardVariant Types

`FULL_IMAGE`, `FULL_VIDEO`, `CONTENT`. Both `FULL_IMAGE` and `CONTENT` support an
optional `backgroundSrc`. See [CONTENT.md](CONTENT.md) for full examples.

### ContentBlock Types

`CONTENT_IMAGE`, `CONTENT_TEXT`, `CONTENT_TITLE`, `CONTENT_VIDEO`, `CONTENT_SOCIAL`,
`CONTENT_SUBTEXT`, `CONTENT_CODE`, `CONTENT_QUIZ`, `CONTENT_BUTTON`. See [CONTENT.md](CONTENT.md).

---

## Endpoints

All endpoints except `/health` require `Authorization: Bearer <READ_KEY>`.

### `GET /health`

```json
{ "status": "ok", "forks": 9 }
```

### `GET /forks/:forkId` — fork metadata + feed summaries

```json
{
  "fork": {
    "id": "nature-fork",
    "title": "Nature Fork",
    "description": "A calming nature experience",
    "imageSrc": "https://example.com/fork.jpg"
  },
  "feeds": [
    {
      "id": "calming-nature",
      "title": "Calming Nature",
      "description": "Peaceful nature imagery",
      "imageSrc": "https://example.com/cover.jpg",
      "mode": "sequential",
      "scrollDirection": "vertical",
      "engagement": true,
      "dynamic": false,
      "cardCount": 42
    }
  ]
}
```

`cardCount` is `null` and `dynamic` is `true` for dynamic feeds. `actionLabel` /
`actionUrl` appear on `fork` only when set.

**Error `404`:** `{ "error": "Fork not found" }`

### `GET /forks/:forkId/feeds/:feedId/cards` — a page of cards

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | 1-indexed page |
| `limit` | integer | `10` | cards per page (clamped to 50) |

```json
{
  "cards": [ { "id": "nature-001", "variants": [] } ],
  "pagination": { "page": 1, "limit": 10, "totalCards": 42, "totalPages": 5, "hasMore": true },
  "meta": { "forkId": "nature-fork", "feedId": "calming-nature", "dynamic": false }
}
```

- **Static feeds**: slice of the bundled `cards` array; `totalCards` / `totalPages` are real numbers.
- **Dynamic feeds**: `generate()` is called; `totalCards` / `totalPages` are `null`, `hasMore` comes from the generator. For `mode: "random"` the page is used as the generator seed (stable, non-repeating infinite scroll).

**Error `404`:** `{ "error": "Feed not found" }`

### `GET /forks/:forkId/cards/:cardId` — single card (optional)

Looks the card up in the fork's static feeds. Dynamic cards are page-derived and not
addressable by id.

```json
{ "id": "nature-001", "variants": [] }
```

**Error `404`:** `{ "error": "Card not found" }`

---

## Authoring content

1. Create `forks/<fork-id>/fork.ts` exporting a `Fork` (default export).
2. Add one file per feed in the same folder, next to `fork.ts`:
   - static: `<feed-id>.ts` exporting a `StaticFeed`
   - dynamic: `<feed-id>.dynamic.ts` exporting a `DynamicFeed`
3. Run `npm run convert` to (re)generate the `forks/index.ts` registry, or add the
   import by hand. The converter can also migrate a legacy JSON manifest:
   `node scripts/manifest-to-fork.mjs manifests/<file>.json`.
4. `npm run typecheck` then `npm run deploy`.

See [CONTENT.md](CONTENT.md) for variant/block examples and the dynamic-feed pattern
in [`forks/counting-sheep/`](forks/counting-sheep).
