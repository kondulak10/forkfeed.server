# forkfeed.server

Tiny, edge-deployed content server for the [forkfeed protocol](PROTOCOL.md). Part of
[forkfeed.link](https://forkfeed.link). Runs on Cloudflare Workers + Hono. **No
database** - content is typed TypeScript files bundled into the worker at build time.
One runtime dependency, zero cold start.

**Forking this repo?** See **[DEPLOY.md](DEPLOY.md)** for the complete fork-to-deploy guide.

## Content Hierarchy

```
Fork → Feed → Card → Variant
```

- **Fork** - a curated playlist of feeds (e.g. "Atomic Habits")
- **Feed** - a named collection of cards (e.g. "The Power of Tiny Changes")
- **Card** - a single piece of content with one or more visual variants
- **Variant** - one view of a card: full-screen image, video, or rich content blocks

## How Content Works

```
forks/<id>/fork.ts + <feed>.ts   --(npm run deploy)-->   Cloudflare Worker
        (typed, bundled at build)                              |
                                                     GET /forks/:id  (+ /feeds/:fid/cards)
                                                               |
                                            app-server  --(publish)-->  Mobile App
```

- **Static feeds** (books, guides): a `StaticFeed` file with a fixed `cards` array.
- **Dynamic feeds** (counting sheep): a `<feed>.dynamic.ts` file exporting a
  `DynamicFeed` with a `generate(page, limit, seed)` function - infinite, on-demand.
- To make a fork visible in the app, POST its URL + id to the app-server's
  `/api/content/publish` (forks start **private**).

## Quick Start

```bash
npm install                       # install dependencies
cp wrangler.toml.example wrangler.toml  # set READ_KEY in [vars] (defaults to "read")
npm run typecheck                 # the TS compiler validates all content under forks/
npm run deploy                    # deploy to Cloudflare Workers
```

## Environment Variables

Set in `wrangler.toml` `[vars]` (or via `wrangler secret put`):

| Variable | Description | Default |
|---|---|---|
| `READ_KEY` | Bearer token for read routes | `read` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `*` |

For the image/content scripts (shell env): `CDN_DOMAIN`, `S3_BUCKET` (used by
`scripts/upload-image.sh`), and `FORKFEED_TOKEN` (for publishing to the app).

## Common Commands

```bash
npm run publish       # deploy the worker AND register every fork with the forkfeed app
npm run deploy        # just deploy: regen registry + typecheck + wrangler deploy
npm run typecheck     # validate all content under forks/ (deploy runs this for you)
npm run convert       # regenerate forks/index.ts (deploy runs this for you)
npm run dev           # local dev server
```

The whole loop is **edit files → `npm run publish` → flip the fork to public in the
app**. `npm run publish` deploys your worker and registers every fork in `forks/` with
the forkfeed app (as private). It needs `FORKFEED_SERVER_URL` (your worker URL) and
`FORKFEED_TOKEN` in `.dev.vars` - see [DEPLOY.md](DEPLOY.md). Use `npm run deploy` alone
if you just want to ship the worker without touching the app.

## Creating Content

- **Manual**: write typed files under `forks/` - see **[CONTENT.md](CONTENT.md)** for
  the format reference, all variant/block types, and a template.
- **From git commits**: use the **[forkfeed plugin](forkfeed-plugin/)** (a Claude Code
  `/forkfeed` command) to generate and publish content automatically.

## API Reference

See **[PROTOCOL.md](PROTOCOL.md)** - the 2 read endpoints, data model, and the
dynamic-feed (generator) pattern.

## Architecture

| Path | Purpose |
|---|---|
| `src/index.ts` | Thin Hono worker: 2 read endpoints + health + single-card lookup |
| `src/types.ts` | Fork / Feed / Card / CardVariant / ContentBlock types (the schema) |
| `forks/index.ts` | Generated registry importing every `forks/<id>/fork.ts` |
| `forks/<id>/fork.ts` | A fork: metadata + ordered feeds |
| `forks/<id>/<feed>.ts` | A `StaticFeed` (fixed cards) |
| `forks/<id>/<feed>.dynamic.ts` | A `DynamicFeed` (generator function) |
| `scripts/manifest-to-fork.mjs` | Convert legacy JSON manifests -> typed files |

**Stack**: Cloudflare Workers (runtime) + Hono (router). No database, no ORM, no
runtime validation library - the TypeScript compiler validates content, and Wrangler
bundles it. To change content, edit a file and redeploy.

## Example Content

The `forks/` directory ships with example forks (book summaries, a city guide, and the
`counting-sheep` dynamic feed). Their images reference the original author's CDN, so
replace the URLs with your own. The reference dynamic feed lives in
[`forks/counting-sheep/`](forks/counting-sheep).

## Dynamic Feeds (Generators)

A `<feed>.dynamic.ts` file exports a `DynamicFeed` whose `generate(page, limit, seed)`
returns a page of cards plus `hasMore`, enabling infinite content with nothing stored.
Generated card IDs should be deterministic (derive a UUID from page+index) so they are
stable across requests. See [PROTOCOL.md](PROTOCOL.md) and the counting-sheep example.

## Scripts

| Command | Description |
|---|---|
| `npm run publish` | Deploy the worker **and** register every fork with the forkfeed app |
| `npm run deploy` | Deploy only: regen registry + typecheck + deploy to Cloudflare |
| `npm run register` | Register forks with the app without re-deploying (uses the live worker) |
| `npm run typecheck` | TypeScript type checking (validates content); deploy runs it for you |
| `npm run convert` | Regenerate `forks/index.ts` / migrate manifests; deploy runs it for you |
| `npm run dev` | Local development server |

## License

[MIT](LICENSE)
