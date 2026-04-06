# forkfeed.server

Lightweight, edge-deployed content backend for the forkfeed protocol.

## Structure

```
src/
  index.ts       - Hono routes (public + admin + push)
  db.ts          - D1 query helpers, snake_case <-> camelCase mapping
  types.ts       - CardVariant and ContentBlock type definitions
  registry.ts    - Card generator registry
  engagement.ts  - Engagement event storage + aggregation (opt-in via manifest `engagement: true`)
  generators/    - Card generators (counting-sheep with deterministic UUIDs + rarity system)
schema.sql       - D1 table definitions (settings, feeds, cards, forks, engagement_events)
migrations/      - D1 schema migrations
scripts/
  push.mjs       - Push manifest(s) to forkfeed via app-server /api/content/push (with chunking for >200 cards)
  delete.mjs     - Deregister this forkfeed server from the app-server (cascade deletes)
  upload-image.sh - Upload images to S3, print CDN URL
  env.mjs        - Environment variable loader for scripts
manifests/       - Content JSON manifest files (forks, feeds, cards)
content/         - Image prompts, lookup tables, and companion files
permanent_content/ - Developer-themed images and backgrounds for MCP content generation
packages/
  forkfeed-mcp/  - MCP server (npm: forkfeed-mcp) for generating content from git commits
forkfeed/        - Generated manifests saved by MCP push operations
PROTOCOL.md      - Complete API specification, data model, generators, deployment
CONTENT.md       - Content creation guide (JSON format, variant types, block types, image hosting)
DEPLOY.md        - Fork-to-deploy guide (Cloudflare setup, image hosting, content creation)
MCP.md           - MCP server setup and usage guide
Manifests.md     - Manifest registry (update when adding/removing/changing manifests)
```

## Commands

```bash
npm run deploy           # Deploy to Cloudflare Workers
npm run push             # Push all manifests to production via app-server
npm run publish          # Deploy + push all manifests
npm run typecheck        # Run tsc --noEmit
npm run db:migrate       # Run schema on remote D1
npm run db:create        # Create D1 database (once)
npm run deregister       # Deregister + cascade delete from app-server
```

## Push Flow

Content is pushed to forkfeed via a single command. The app-server handles forwarding to the card server and registering forks automatically.

```bash
npm run push                              # push all manifests
npm run push -- manifests/<file>.json     # push one manifest
```

1. Forks are created as **private** automatically (no admin approval needed)
2. To go public, the creator changes visibility in the mobile app, which creates a pending approval request
3. Admin approves/denies via the admin panel's Visibility Requests page

## Database Schema

Five D1 tables (defined in `schema.sql`):
- **settings** - server manifest metadata (name, description, version, maintainer, maxPageSize)
- **feeds** - feed definitions with mode, scrollDirection, engagement flag, optional generatorId
- **cards** - card content (variants stored as JSON TEXT), ordered within a feed
- **forks** - fork definitions with feedIds (JSON TEXT), action label/URL
- **engagement_events** - async engagement tracking (session, feed, card, time spent, variant views)

## Endpoints

**Public (READ_KEY auth):**
- `GET /.well-known/forkfeed.json` - manifest (feeds, forks, card counts)
- `GET /feeds/:feedId/cards` - paginated cards (supports mode=sequential|random)
- `POST /feeds/:feedId/cards` - paginated cards + async engagement write
- `GET /cards/:cardId` - single card by ID (supports generator re-derivation)
- `GET /health` - health check (no auth)

**Push (app-server ff_ token auth, verified via APP_SERVER_URL/api/auth/verify):**
- `POST /push` - upsert feeds, forks, cards (max 200 cards per push, D1 batched)

**Admin (ADMIN_KEY auth):**
- `GET/POST/PUT/DELETE /admin/feeds` - feed CRUD
- `GET/POST/PUT/DELETE /admin/cards` - card CRUD (+ bulk delete by feed)
- `GET/POST/PUT/DELETE /admin/forks` - fork CRUD
- `PUT /admin/settings` - update server manifest settings
- `GET /admin/stats` - aggregate counts
- `GET /admin/engagement` - engagement stats (optionally filtered by feedId)

## MCP Server (`packages/forkfeed-mcp/`)

Published as `forkfeed-mcp` on npm. Turns GitHub commits into swipeable forkfeed content. See [MCP.md](MCP.md) for setup.

**Tools:**
- `forkfeed_guide` - returns the content generation guide
- `forkfeed_commits` - lists recent commits with publication status, or analyzes a specific commit (diff + stats + tag-matched images)
- `forkfeed_build` - simplified content builder: takes 6 cards with shorthand blocks, auto-detects repo info, assigns backgrounds by commit tags, resolves image IDs, pushes to server
- `forkfeed_push` - validates and pushes a raw manifest to the app-server
- `forkfeed_status` - lists published forks, feeds, and card counts

**Prompt:** `/forkfeed` - interactive workflow that chains guide -> commits -> build

**Image catalog:** 100+ developer-themed scene images and backgrounds in `src/image-catalog.ts`, referenced by short IDs (e.g. `img47`, `bg12`). Tags enable auto-matching to commit content.

## Environment Variables

**Cloudflare Workers (wrangler.toml secrets):**
- `ADMIN_KEY` - admin route auth token
- `READ_KEY` - public read route auth token
- `ALLOWED_ORIGINS` - comma-separated CORS origins (optional, defaults to `*`)
- `APP_SERVER_URL` - app-server base URL (required for `/push` endpoint token verification)

**Scripts/MCP (shell env):**
- `FORKFEED_TOKEN` - user API token (`ff_...` format, from forkfeed.link/admin/user/token)
- `APP_SERVER_URL` - app-server base URL (default: `https://api.forkfeed.link`)

## Conventions

- **3 dependencies**: hono (router), @cloudflare/workers-types, wrangler
- **Database**: snake_case column names, camelCase in API responses
- **No validation library** - keep it minimal, validate at the boundary only when needed
- **No ORM** - raw D1 queries with helper functions in db.ts
- JSON fields (variants, feedIds, mode) stored as TEXT in D1, parsed/serialized in db.ts
- Fork/feed IDs are kebab-case strings. Card IDs use UUID v4 format
- Admin routes are behind Bearer token auth (`ADMIN_KEY`)
- Public read routes require Bearer token auth (`READ_KEY`)
- Engagement events are written asynchronously via `ctx.waitUntil()` (non-blocking, doesn't delay card response)
- **No em dashes or double hyphens** - never use `--` or em dashes in content or docs. Use `-`, `:`, or `,` depending on context

## Content Policy

All content generated or uploaded to this server must comply with the [Terms of Service](https://forkfeed.link/terms) and [Privacy Policy](https://forkfeed.link/privacy).

**Prohibited content** (Terms, Section 9): illegal, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable material. This includes nudity, sexually explicit content, graphic violence, and hate speech.

This applies to all content types: text blocks, image prompts, quiz questions, code examples, video, and metadata (titles, descriptions, alt text). When generating AI image prompts, ensure prompts cannot produce prohibited imagery.

## Key Patterns

- `rowToApi()` / `safeJsonParse()` in db.ts handle DB <-> API conversion
- Card variants are stored as JSON strings in D1, parsed when serving
- Feeds can have a `generatorId` linking to a registered card generator for infinite content
- `push.mjs` sends manifests to `POST /api/content/push` on the app-server, which forwards to the card server's `/push` endpoint and registers forks automatically
- Push is idempotent - safe to run multiple times (upserts feeds, forks, and cards)
- Generative card IDs use pattern `{prefix}-p{page}-{index}` for re-derivation on single card lookup
- When adding, removing, or significantly changing a manifest in `manifests/` or a generator in `src/generators/`, update `Manifests.md` to reflect the change

## Custom Skills (`.claude/skills/`)

- **generate-content** - Generate forkfeed server content for a topic with web research and AI images
- **generate-book** - Convert a book into forkfeed content (chapter feeds, text cards, quiz feed, AI images)
- **generate-sheep** - Generate the counting sheep sleep-aid feed with rare collectible variants
- **server-actions** - Deploy forkfeed server code, push manifests, publish MCP, or all
