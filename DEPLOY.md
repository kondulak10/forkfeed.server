# Deploy Guide

Fork-to-deploy guide for running your own forkfeed server.

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

Three production dependencies: hono, @cloudflare/workers-types, wrangler.

## 2. Create the D1 Database

```bash
npm run db:create
```

Copy the `database_id` from the output. You will need it in the next step.

## 3. Configure wrangler.toml

```bash
cp wrangler.toml.example wrangler.toml
```

Open `wrangler.toml` and replace `<your-d1-database-id>` with the ID from step 2. This file is gitignored, so your database ID stays private.

## 4. Configure Environment Variables

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:

| Variable | What to set |
|---|---|
| `ADMIN_KEY` | A strong random string for admin API access |
| `READ_KEY` | A strong random string for public read endpoints |
| `CARD_SERVER_URL` | Leave blank for now, fill after first deploy (step 7) |
| `CDN_DOMAIN` | Your CDN domain for image hosting (see Image Hosting below) |

This file is gitignored. Scripts read it automatically.

## 5. Run Schema Migration

```bash
npm run db:migrate
```

This creates all tables in your remote D1 database.

## 6. Set Production Secrets

```bash
wrangler secret put ADMIN_KEY
wrangler secret put READ_KEY
```

Use the same values as `.dev.vars`. These are stored encrypted in Cloudflare, separate from your code.

## 7. Deploy

```bash
npm run deploy
```

Note the worker URL from the output (e.g. `https://forkfeed-server.your-name.workers.dev`). Update `CARD_SERVER_URL` in `.dev.vars` with this URL.

## Image Hosting

Card images can be hosted anywhere. The server stores URLs, not files. Two recommended options:

### Option A: AWS S3 + CloudFront

1. Create an S3 bucket (any region)
2. Create a CloudFront distribution pointing to the bucket
3. Set environment variables before uploading images:
   ```bash
   export S3_BUCKET=your-bucket-name
   export CDN_DOMAIN=your-distribution-id.cloudfront.net
   ```
4. Upload images:
   ```bash
   bash scripts/upload-image.sh photo.jpg content/my-project/photo.jpg
   # Prints: https://your-distribution-id.cloudfront.net/content/my-project/photo.jpg
   ```
5. Set `CDN_DOMAIN` in `.dev.vars` to your CloudFront domain

### Option B: Cloudflare R2

1. Create an R2 bucket in the Cloudflare dashboard
2. Enable public access or connect a custom domain
3. Upload images via the R2 dashboard, `wrangler r2 object put`, or the S3-compatible API
4. Use the public URL as your CDN domain in `.dev.vars`

### Prototyping Without a CDN

For quick testing, use public image services:
- `https://picsum.photos/seed/my-card/800/1200` for placeholder images
- Unsplash, Imgur, or any direct image URL

## Creating Content

### Use the built-in Claude Code skills

The repo includes skills for AI-assisted content generation:

| Skill | What it does |
|---|---|
| `/generate-content` | Create content for any topic with web research and AI images |
| `/generate-book` | Convert a book into chapter feeds, content cards, and quiz feeds |
| `/generate-push` | Turn GitHub commits into swipeable cards |
| `/generate-sheep` | Generate the counting sheep sleep-aid feed |

These skills handle JSON generation, image prompt creation, and CDN upload. They read background images from `permanent_content/` files, which use `{{CDN_DOMAIN}}` as a placeholder resolved from your `.dev.vars`.

### Manual JSON

See [CONTENT.md](CONTENT.md) for the full format reference, all variant and block types with examples, and a copy-pasteable template.

### Customize permanent_content

The `permanent_content/` directory contains pre-made image catalogs used by the skills:

- `backgrounds.md`: 50 background images with mood and color metadata
- `it-scenes-index.md`: 230 IT-themed scene images

These files use `{{CDN_DOMAIN}}` as a placeholder. To use them:

1. Generate or source your own images matching the descriptions in each entry
2. Upload them to your CDN using the same path structure (e.g. `content/push/bg1_202603270001.jpeg`)
3. Set `CDN_DOMAIN` in `.dev.vars` to your domain

Or create entirely new `permanent_content/` files with your own images and descriptions.

### Source code CDN reference

The counting sheep generator has one hardcoded CDN domain in `src/generators/counting-sheep-data.ts`. If you fork and want to use your own sheep images, update the `CDN` constant on line 5 with your domain.

## Uploading and Deploying Content

```bash
# Upload a single manifest to your server
node scripts/upload.mjs manifests/my-content.json

# Deploy code + sync all manifests (most common)
npm run publish

# Local development
npm run dev
node scripts/upload.mjs manifests/my-content.json http://localhost:8787
```

## App-Server Registration (Optional)

Registration connects your forkfeed server to the forkfeed app-server, making your forks visible in the mobile app. **This step is optional.** Your forkfeed server works standalone as a content API without registration.

To register:

1. Get an auth token from the app-server
2. Set `AUTH_TOKEN` and `APP_SERVER_URL` in your environment or `.dev.vars`
3. Register your forks:
   ```bash
   AUTH_TOKEN=<your-jwt> APP_SERVER_URL=<app-server-url> npm run register
   ```
4. Forks start as **private**. Change visibility in the mobile app (requires admin approval)

See [README.md](README.md) for the full registration flow.

## Included Example Content

The `manifests/` directory contains ready-to-upload content packs (book summaries, city guides, etc.). These reference the original author's CDN, so images will not load from your server. They serve as format examples. Create your own content using the skills or the template in [CONTENT.md](CONTENT.md).

## Production Checklist

- [ ] `ADMIN_KEY` and `READ_KEY` are strong random strings (not the defaults `admin`/`read`)
- [ ] Production secrets set via `wrangler secret put` (not just in `.dev.vars`)
- [ ] `CARD_SERVER_URL` in `.dev.vars` points to your deployed worker
- [ ] `CDN_DOMAIN` in `.dev.vars` matches your image hosting domain
- [ ] `.dev.vars` is in `.gitignore` (it is by default)
- [ ] `wrangler.toml` is in `.gitignore` (it is by default, contains your database ID)
- [ ] Schema migration has been run (`npm run db:migrate`)
