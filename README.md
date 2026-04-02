# forkfeed.server

Lightweight, edge-deployed content backend for the [forkfeed protocol](PROTOCOL.md). Part of [forkfeed.link](https://forkfeed.link). Runs on Cloudflare Workers + D1 (SQLite) + Hono. One production dependency, zero cold start.

**Forking this repo?** See **[DEPLOY.md](DEPLOY.md)** for the complete fork-to-deploy guide.

## Content Hierarchy

```
Fork → Feed → Card → Variant
```

- **Fork** — a curated playlist of feeds (e.g. "Harry Potter: Philosopher's Stone")
- **Feed** — a named collection of cards (e.g. "Diagon Alley")
- **Card** — a single piece of content with one or more visual variants
- **Variant** — one view of a card: full-screen image, video, or rich content blocks

## How Content Gets Live

```
manifests/*.json  --upload-->  D1 Database  --serves-->  Mobile App
                                                            |
                                                    app-server registration
                                                    (makes forks visible)
```

- **Static feeds** (books, guides): manifest JSON has all cards inline, stored in D1
- **Generator feeds** (counting sheep): manifest has no cards, feed has `generatorId`, cards generated at request time
- All IDs (fork, feed, card) must be UUID v4

## Quick Start

```bash
npm install                    # Install dependencies
cp .dev.vars.example .dev.vars # Configure environment variables
# Edit .dev.vars with your values (ADMIN_KEY, READ_KEY, CARD_SERVER_URL)
npm run db:migrate             # Run schema on remote D1
npm run publish                # Deploy code + sync all manifests
```

## Environment Variables

All scripts read from `.dev.vars` automatically (gitignored). Copy `.dev.vars.example` to get started.

| Variable | Description | Default |
|---|---|---|
| `ADMIN_KEY` | Bearer token for admin API routes | `admin` |
| `READ_KEY` | Bearer token for public read routes | `read` |
| `FORKFEED_TOKEN` | User API token for pushing content | (required for push) |
| `APP_SERVER_URL` | App-server base URL | `https://api.forkfeed.link` |
| `CARD_SERVER_URL` | Public URL of your deployed worker | (required for deregister) |
| `CDN_DOMAIN` | CDN domain for image hosting (used by skills) | (required for images) |
| `S3_BUCKET` | S3 bucket name (used by `upload-image.sh`) | (required for S3 uploads) |

## Common Commands

| I changed... | Run |
|---|---|
| A manifest JSON file | `npm run publish` |
| Generator code only | `npm run deploy` |
| Both | `npm run publish` |
| Push one manifest only | `npm run push -- manifests/foo.json` |

```bash
npm run publish                              # Deploy code + push all manifests (most common)
npm run deploy                               # Deploy code only
npm run push                                 # Push all manifests (no code deploy)
npm run push -- manifests/foo.json           # Push a single manifest
npm run deregister                           # Remove all forks from app-server
```

Forks start as **private**. To make them public, change visibility in the app (requires admin approval).

## Initial Cloudflare Setup

```bash
npm run db:create              # Create D1 database (once)
# Copy the database_id from output into wrangler.toml
npm run db:migrate             # Run schema on remote D1
wrangler secret put ADMIN_KEY  # Set admin auth key
wrangler secret put READ_KEY   # Set read auth key (required for public endpoints)
npm run deploy                 # Deploy to Cloudflare Workers
```

## Creating Content

See **[CONTENT.md](CONTENT.md)** for the full content creation guide — JSON format reference, all variant and block types with examples, image hosting options, and a copy-pasteable template.

## API Reference

See **[PROTOCOL.md](PROTOCOL.md)** for the complete API specification — public endpoints, admin CRUD, pagination, generators, and data model.

## Architecture

| File | Purpose |
|---|---|
| `src/index.ts` | Hono routes (public + admin) |
| `src/db.ts` | D1 query helpers, snake_case ↔ camelCase mapping |
| `src/types.ts` | CardVariant and ContentBlock type definitions |
| `src/registry.ts` | Card generator registry |
| `src/generators/` | Custom generator implementations (e.g. counting-sheep) |
| `src/engagement.ts` | Engagement event storage and aggregation (optional, opt-in via manifest) |

**Stack**: Cloudflare Workers (runtime) + D1/SQLite (database) + Hono (router). No ORM, no validation library, no build step — Wrangler handles TypeScript compilation.

**Conventions**: snake_case in the database, camelCase in the API. Timestamps are ISO 8601 strings.

## Content Examples

The `manifests/` directory contains ready-to-upload content packs:

| File | Description |
|---|---|
| `atomic-habits.json` | Book retold as visual cards with action buttons, quiz feeds, and FULL_IMAGE + CONTENT variants |
| `failing-forward.json` | Book summary cards |
| `how-to-win-friends-and-influence-people.json` | Book summary cards |
| `ostrava-guide.json` | City guide with location-based content |
| `psychology-of-money.json` | Book summary cards |
| `the-48-laws-of-power.json` | Book summary cards |
| `the-daily-stoic.json` | Daily philosophy cards |
| `thinking-fast-and-slow.json` | Book summary cards |
| `tfip-kondulak10-forkfeed-app.json` | GitHub commits as swipeable cards with CONTENT_CODE, CONTENT_BUTTON, and multi-variant layouts |

## Generators

Feeds can be backed by a **card generator** instead of stored cards, producing infinite, on-demand content. See [PROTOCOL.md](PROTOCOL.md#generators) for the generator API.

Built-in generators:

| Generator | Description |
|---|---|
| `counting-sheep` | Infinite sleep-aid stream with deterministic rare variants using Knuth's multiplicative hash |

Custom generators live in `src/generators/` and register themselves via `registerGenerator(id, fn)` at import time.

### Persistent Generators

The built-in generators are deterministic - same page and index always produce the same card. This is required so single-card lookups (`GET /cards/{cardId}`) can re-derive a card from its ID without storing it.

An alternative approach for truly random or AI-generated content: persist each generated card to D1 on first creation. The flow becomes:

1. User requests next page of cards
2. Generator creates random cards (external APIs, AI, Math.random, etc.)
3. Cards are written to D1 before returning
4. Subsequent single-card lookups hit the database normally

This removes the deterministic constraint entirely. The tradeoff is storage grows over time, but D1 is cheap and old cards can be cleaned up periodically.

This pattern is not implemented in the built-in generators but the architecture supports it - generators have access to the D1 binding and can write cards during generation.

## Scripts

| Command | Description |
|---|---|
| `npm run publish` | Deploy code + sync all manifests (most common) |
| `npm run deploy` | Deploy code to Cloudflare Workers |
| `npm run push` | Push all manifests via app-server |
| `npm run dev` | Local development server |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:create` | Create D1 database (once) |
| `npm run db:migrate` | Run schema on remote D1 |
| `npm run deregister` | Remove all forks from app-server |

## License

[MIT](LICENSE)
