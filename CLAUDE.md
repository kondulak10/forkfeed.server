# forkfeed.server

Tiny, edge-deployed content server for the forkfeed protocol. **No database**:
content is typed TypeScript under `forks/`, bundled into the worker at build time.

## Structure

```
src/
  index.ts       - Thin Hono worker: 2 read endpoints + health + single-card lookup, READ_KEY auth
  types.ts       - Fork / Feed / Card / CardVariant / ContentBlock type definitions (the "schema")
forks/
  index.ts       - AUTO-GENERATED registry: imports every forks/<id>/fork.ts into FORKS
  <fork-id>/
    fork.ts                  - Fork (metadata + ordered feeds), default export
    <feed-id>.ts             - StaticFeed (fixed cards array), default export
    <feed-id>.dynamic.ts     - DynamicFeed (generate() function), default export
  counting-sheep/  - reference dynamic fork (infinite generator + rarity tiers)
scripts/
  manifest-to-fork.mjs - Convert legacy JSON manifest(s) -> typed fork files + regenerate registry
  upload-image.sh      - Upload images to S3, print CDN URL
  env.mjs              - Env loader for scripts
manifests/       - Legacy JSON manifests (source for the converter; forks/ is now the source of truth)
permanent_content/ - Developer-themed images and backgrounds for MCP content generation
packages/
  forkfeed-mcp/  - MCP server (npm: forkfeed-mcp)
PROTOCOL.md      - API spec + data model
CONTENT.md       - Content authoring guide (variant/block types, image hosting)
DEPLOY.md        - Fork-to-deploy guide
MCP.md           - MCP server setup and usage
```

## Commands

```bash
npm run publish          # Deploy the worker AND register every fork with the forkfeed app (needs FORKFEED_SERVER_URL + FORKFEED_TOKEN in .dev.vars)
npm run deploy           # Deploy only: regen registry + typecheck + wrangler deploy
npm run register         # Register forks with the app without re-deploying (scripts/publish.mjs against the live worker)
npm run typecheck        # tsc --noEmit (type-checks all content under forks/) - run standalone if you just want to validate
npm run convert          # Regenerate forks/index.ts (and migrate manifests/*.json if present) - deploy runs this for you
```

## Architecture

- The worker imports `forks/index.ts`, an in-memory `Record<forkId, Fork>` built at
  module load. Static feeds are sliced for pagination; dynamic feeds call `generate()`.
- The typed TS objects ARE the runtime data. There is no DB, no push, no admin CRUD:
  to change content, edit a file and redeploy. To change which content exists, add or
  remove a `forks/<id>/` folder and rerun `npm run convert` (or hand-edit `forks/index.ts`).
- **Engagement tracking lives on the app-server now**, not here.

## Endpoints

All except `/health` require `Authorization: Bearer <READ_KEY>` (default `"read"`).

- `GET /health` - `{ status, forks }`
- `GET /forks` - list of `{ id, title, feedCount }` (discovery; used by `npm run publish`)
- `GET /forks/:forkId` - fork metadata + feed summaries (each with `dynamic` + `cardCount`)
- `GET /forks/:forkId/feeds/:feedId/cards?page&limit` - a page of cards
- `GET /forks/:forkId/cards/:cardId` - single card (static feeds only)

See [PROTOCOL.md](PROTOCOL.md) for full request/response shapes.

## Authoring content

1. `forks/<fork-id>/fork.ts` default-exports a `Fork` (`{ meta, feeds: [...] }`).
2. One feed file per feed, next to `fork.ts`: `<feed-id>.ts` (`StaticFeed` with
   `cards`) or `<feed-id>.dynamic.ts` (`DynamicFeed` with `dynamic: true` + `generate()`).
3. `npm run deploy` - it regenerates the registry, typechecks, then deploys. (Or run `npm run convert` / `npm run typecheck` standalone while iterating.)

The converter `scripts/manifest-to-fork.mjs` migrates a legacy manifest into typed
files: `node scripts/manifest-to-fork.mjs manifests/<file>.json`. It skips
generator-backed manifests (those are hand-written `.dynamic.ts` feeds, e.g.
`forks/counting-sheep/`).

## Environment Variables

**Cloudflare Workers (`wrangler.toml` `[vars]` or `wrangler secret put`):**
- `READ_KEY` - read route auth token (optional, defaults to `"read"`)
- `ALLOWED_ORIGINS` - comma-separated CORS origins (optional, defaults to `*`)

## Conventions

- **1 runtime dependency**: hono (+ @cloudflare/workers-types, wrangler, typescript dev deps)
- Fork/feed IDs are kebab-case strings. Card IDs use UUID v4 format
- Read routes require Bearer token auth (`READ_KEY`)
- Content is validated by the TypeScript type-checker, not at runtime - run `npm run typecheck`
- **No em dashes or double hyphens** - never use `--` or em dashes in content or docs. Use `-`, `:`, or `,` depending on context

## Content Policy

All content must comply with the [Terms of Service](https://forkfeed.link/terms) and
[Privacy Policy](https://forkfeed.link/privacy).

**Prohibited content** (Terms, Section 9): illegal, harmful, threatening, abusive,
harassing, defamatory, obscene, or otherwise objectionable material. This includes
nudity, sexually explicit content, graphic violence, and hate speech. This applies to
all content types: text blocks, image prompts, quiz questions, code examples, video,
and metadata (titles, descriptions, alt text). When generating AI image prompts,
ensure prompts cannot produce prohibited imagery.

## Key Patterns

- The fork registry `forks/index.ts` is generated by `npm run convert` - do not hand-edit unless adding a single import quickly
- Dynamic feeds live in `<feed-id>.dynamic.ts` and export a `DynamicFeed`; for `mode: "random"` the request page is used as the generator seed (stable, non-repeating infinite scroll)
- Generative card IDs should be deterministic (derive a UUID from page+index) so they are stable across requests; see `forks/counting-sheep/counting-sheep-feed.dynamic.ts`

## Custom Skills (`.claude/skills/`)

- **generate-content** - Generate forkfeed server content for a topic with web research and AI images
- **generate-book** - Convert a book into forkfeed content (chapter feeds, text cards, quiz feed, AI images)
- **generate-sheep** - Generate the counting sheep sleep-aid feed with rare collectible variants
- **server-actions** - Deploy forkfeed server code, push manifests, publish MCP, or all
