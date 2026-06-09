# Deploy Guide

Fork-to-deploy guide for running your own forkfeed server. There is **no database**:
content lives as typed TypeScript files under `forks/` and is bundled into the worker
at build time.

## Prerequisites

- **Node.js 18+** and npm
- **Cloudflare account** (free tier works)
- **Wrangler CLI**: `npm install -g wrangler` then `wrangler login`
- **Optional**: AWS account for S3 + CloudFront image hosting (or use Cloudflare R2)

## 1. Clone and Install

```bash
git clone https://github.com/your-username/forkfeed.server.git
cd forkfeed.server
npm install
```

## 2. Configure wrangler.toml

```bash
cp wrangler.toml.example wrangler.toml
```

Set your read key in the `[vars]` block (defaults to `read` if unset). No database
binding is needed.

```toml
[vars]
READ_KEY = "your-read-key"
```

For a production secret instead of a plaintext var:

```bash
wrangler secret put READ_KEY
```

## 3. Local dev vars (optional)

```bash
cp .dev.vars.example .dev.vars
```

| Variable | What to set |
|---|---|
| `READ_KEY` | Read key for `wrangler dev` (defaults to `read`) |
| `CDN_DOMAIN` | Your CDN domain for image hosting (see Image Hosting below) |

## 4. Add content

Content is typed files under `forks/<fork-id>/`. See [CONTENT.md](CONTENT.md) for the
format and a copy-pasteable template, or generate it from git commits with the
[forkfeed plugin](forkfeed-plugin/). You don't need to run anything after adding a fork - the deploy
step below regenerates the registry and typechecks for you. To validate while
iterating, you can run these standalone:

```bash
npm run convert     # regenerate forks/index.ts (scans forks/*/fork.ts)
npm run typecheck   # the TS compiler validates all content
```

## 5. Deploy

```bash
npm run deploy   # regenerates forks/index.ts + typechecks, then deploys
```

Note the worker URL from the output (e.g. `https://forkfeed-server.your-name.workers.dev`).
Verify it serves: `GET /forks/:forkId` and `GET /forks/:forkId/feeds/:feedId/cards`
(both require `Authorization: Bearer <READ_KEY>`).

## 6. Publish to the forkfeed app

To surface your forks in the forkfeed app, register them. The easy way registers
**every** fork on your server in one command:

```bash
# set these in .dev.vars first:
#   FORKFEED_SERVER_URL=https://your-worker.workers.dev   (your deployed worker)
#   FORKFEED_TOKEN=ff_...                                 (forkfeed.link/admin/user/token)
npm run publish      # deploys, then registers every fork with the app
```

`npm run publish` = `npm run deploy` + `scripts/publish.mjs`, which hits the worker's
`GET /forks` to discover your fork ids and POSTs each to the app's
`/api/content/publish`. Use `npm run register` to register against the already-deployed
worker without redeploying.

Prefer to do one fork by hand? POST it directly:

```bash
curl -X POST https://api.forkfeed.link/api/content/publish \
  -H "Authorization: Bearer $FORKFEED_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"forkServerUrl":"https://your-worker.workers.dev","forkId":"my-fork","readKey":"read"}'
```

Forks register as **private**; to go public, change visibility in the app (requires
admin approval).

## Image Hosting

Card images can be hosted anywhere. The server stores URLs, not files. Two options:

### Option A: AWS S3 + CloudFront

1. Create an S3 bucket and a CloudFront distribution pointing to it.
2. Set env vars and upload:
   ```bash
   export S3_BUCKET=your-bucket-name
   export CDN_DOMAIN=your-distribution-id.cloudfront.net
   bash scripts/upload-image.sh photo.jpg content/my-project/photo.jpg
   # Prints: https://your-distribution-id.cloudfront.net/content/my-project/photo.jpg
   ```

### Option B: Cloudflare R2

1. Create an R2 bucket, enable public access or attach a custom domain.
2. Upload via the dashboard, `wrangler r2 object put`, or the S3-compatible API.
3. Use the public URL as your CDN domain.

### Prototyping Without a CDN

- `https://picsum.photos/seed/my-card/800/1200` for placeholders
- Unsplash, Imgur, or any direct image URL

## Creating Content

- **Manual**: write typed files under `forks/` - see [CONTENT.md](CONTENT.md).
- **From git commits**: use the [forkfeed plugin](forkfeed-plugin/) (a Claude Code
  `/forkfeed` command) to generate and publish content automatically.

The counting-sheep generator has one hardcoded CDN domain in
`forks/counting-sheep/sheep-data.ts`. If you want your own sheep images, update the
`CDN` constant there.

## Included Example Content

The `forks/` directory ships with example content (book summaries, a city guide, the
counting-sheep dynamic feed). These reference the original author's CDN, so images
will not load from your server until you replace the URLs. They serve as format
examples. The legacy `manifests/*.json` files are kept only as input for
`npm run convert` (`scripts/manifest-to-fork.mjs`).

## Production Checklist

- [ ] `READ_KEY` is a strong random string (not the default `read`) if you want a private feed
- [ ] `READ_KEY` set via `wrangler secret put` or `[vars]` in `wrangler.toml`
- [ ] `CDN_DOMAIN` matches your image hosting domain
- [ ] `npm run typecheck` passes (validates all content under `forks/`; `npm run deploy` also runs this)
- [ ] `forks/index.ts` is up to date (`npm run deploy` regenerates it automatically)
- [ ] `wrangler.toml` is in `.gitignore` if it holds secrets
