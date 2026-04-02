# forkfeed.server

Lightweight, edge-deployed content backend for the forkfeed protocol.

## Structure

```
src/
  index.ts       - Hono routes (public + admin)
  db.ts          - D1 query helpers, snake_case <-> camelCase mapping
  types.ts       - CardVariant and ContentBlock type definitions
  registry.ts    - Card generator registry
  engagement.ts  - Engagement event storage + aggregation (opt-in via manifest `engagement: true`)
schema.sql       - D1 table definitions
migrations/      - D1 schema migrations (rename tables, add engagement)
scripts/
  push.mjs       - Push manifest(s) to forkfeed via app-server /api/content/push
  delete.mjs     - Deregister this forkfeed server from the app-server (cascade deletes)
  upload-image.sh - Upload images to S3, print CDN URL
manifests/       - Content JSON manifest files (forks, feeds, cards)
content/         - Image prompts, lookup tables, and companion files
PROTOCOL.md      - Complete API specification, data model, generators, deployment
CONTENT.md       - Content creation guide (JSON format, variant types, block types, image hosting)
DEPLOY.md        - Fork-to-deploy guide (Cloudflare setup, image hosting, content creation)
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

**Environment variables for push:**
- `FORKFEED_TOKEN` - User API token (required). Get at `forkfeed.link/admin/user/token`
- `APP_SERVER_URL` - App-server base URL (default: `https://api.forkfeed.link`)

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
