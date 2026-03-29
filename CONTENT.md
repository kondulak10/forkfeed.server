# Content Creation Guide

This guide covers everything you need to create content for a forkfeed.server instance.

## Content Rules

All content served through forkfeed.server must comply with the Forkfeed [Terms of Service](https://forkfeed.link/terms). The following content is strictly prohibited:

- Nudity, pornography, or sexually explicit material
- Graphic violence or gore
- Hate speech or discrimination targeting any group
- Harassment, bullying, threats, or doxxing
- Content that exploits or endangers minors
- Content promoting self-harm or suicide
- Illegal activity (drug sales, weapons trafficking, fraud, terrorism)
- Deliberately false health or safety information
- Spam, deceptive, or bulk unsolicited content

Forks containing prohibited content will be removed from the platform. Repeated violations will result in permanent backend deregistration.

Review the [Privacy Policy](https://forkfeed.link/privacy) for data handling requirements.

## Content Hierarchy

```
Fork
 └── Feed (ordered list)
      └── Card (ordered list)
           └── Variant (horizontal swipe)
```

- **Fork**: A curated playlist — groups feeds into a coherent experience. Users browse forks.
- **Feed**: A chapter or topic within a fork. Each feed has its own paginated card feed.
- **Card**: A single piece of content. Cards scroll vertically with snap-to-card behavior.
- **Variant**: One visual view of a card. Cards with multiple variants support horizontal swiping (e.g. an image on the first swipe, details on the second).

## JSON File Format

Content is defined in JSON files with three top-level arrays:

```json
{
  "forks": [...],
  "feeds": [...],
  "cards": [...]
}
```

Upload with:

```bash
node scripts/upload.mjs manifests/my-content.json
```

### Fork Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | `string` | Yes | Unique identifier (kebab-case) |
| `title` | `string` | Yes | Display title |
| `description` | `string` | Yes | Short description |
| `imageSrc` | `string` | Yes | Cover image URL |
| `feedIds` | `string[]` | Yes | Ordered list of feed IDs |
| `actionLabel` | `string` | No | Button text (e.g. "Buy the Full Book") |
| `actionUrl` | `string` | No | URL the button opens in the browser |

### Feed Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | `string` | Yes | Unique identifier (kebab-case) |
| `title` | `string` | Yes | Display title |
| `description` | `string` | Yes | Short description |
| `imageSrc` | `string` | Yes | Cover image URL |
| `mode` | `string` | No | `"sequential"` (default) or `"random"` |
| `engagement` | `boolean` | No | `true` to enable engagement tracking (default `false`) |

### Card Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | `string` | Yes | Unique identifier |
| `feedId` | `string` | Yes | Parent feed ID |
| `order` | `integer` | No | Sort order within feed (default `0`) |
| `variants` | `CardVariant[]` | Yes | One or more variant objects |

## Card Variant Types

Every card has a `variants` array containing one or more variant objects. Each variant has a `type` field.

### FULL_IMAGE

Full-screen image card. Best for photography, cover art, and visual impact.

**Basic usage** - `imageSrc` fills the entire card:

```json
{
  "type": "FULL_IMAGE",
  "imageSrc": "https://example.com/photo.jpg",
  "title": "Sunset at the Lake",
  "subtitle": "Golden hour in the mountains"
}
```

**Two-layer usage** - `backgroundSrc` fills the card, `imageSrc` floats on top as a contained foreground (great for product shots, character art, stickers, transparent PNGs):

```json
{
  "type": "FULL_IMAGE",
  "imageSrc": "https://example.com/product-cutout.png",
  "backgroundSrc": "https://example.com/gradient-bg.jpg",
  "title": "New Arrival",
  "subtitle": "Limited edition"
}
```

When multiple variants in the same card share the same `backgroundSrc`, the background stays perfectly static while the foreground images swipe - ideal for showcasing different products or characters against a consistent backdrop.

| Field | Type | Required | Description |
|---|---|---|---|
| `imageSrc` | `string` | Yes | Primary image. Full-bleed when no `backgroundSrc`, foreground element (contained, preserving aspect ratio) when `backgroundSrc` is set |
| `backgroundSrc` | `string` | No | Full-bleed background layer. Use for gradients, textures, or solid colors behind a transparent PNG foreground |
| `title` | `string` | No | Title overlay at bottom of card |
| `subtitle` | `string` | No | Subtitle below title |

### FULL_VIDEO

Full-screen video card. For ambient loops, tutorials, or cinematic content.

```json
{
  "type": "FULL_VIDEO",
  "videoSrc": "https://example.com/video.mp4",
  "posterSrc": "https://example.com/poster.jpg",
  "title": "Morning Forest"
}
```

| Field | Type | Required |
|---|---|---|
| `videoSrc` | `string` | Yes |
| `posterSrc` | `string` | No |
| `title` | `string` | No |

### CONTENT

Rich content card with an array of content blocks. For articles, tutorials, social quotes, and mixed-media layouts.

```json
{
  "type": "CONTENT",
  "backgroundSrc": "https://example.com/bg.jpg",
  "blocks": [
    { "type": "CONTENT_TITLE", "title": "Getting Started", "subtitle": "A quick introduction" },
    { "type": "CONTENT_TEXT", "text": "Welcome to the guide..." },
    { "type": "CONTENT_IMAGE", "imageSrc": "https://example.com/diagram.png", "sizing": "automatic" }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `blocks` | `ContentBlock[]` | Yes (min 1 block) | Array of content blocks |
| `backgroundSrc` | `string` | No | Optional background image rendered full-bleed behind the glass card with a dark overlay |

## Content Block Types

Used inside `CONTENT` variant `blocks` arrays.

### CONTENT_TITLE

Heading with optional subtitle. Typically the first block in a content card.

```json
{ "type": "CONTENT_TITLE", "title": "Chapter One", "subtitle": "The Beginning" }
```

### CONTENT_TEXT

Body text paragraph.

```json
{ "type": "CONTENT_TEXT", "text": "Harry had always been small and skinny for his age..." }
```

### CONTENT_IMAGE

Inline image within a content card. The `sizing` field controls the aspect ratio.

```json
{ "type": "CONTENT_IMAGE", "imageSrc": "https://example.com/illustration.jpg", "alt": "A castle on a hill", "sizing": "automatic" }
```

| Field | Type | Required | Description |
|---|---|---|---|
| `imageSrc` | `string` | Yes | Image URL |
| `alt` | `string` | No | Accessibility text |
| `sizing` | `string` | Yes | Aspect ratio mode for the image |

Supported `sizing` values:

| Value | Aspect Ratio | Behavior |
|---|---|---|
| `automatic` | Detected from image (capped at 3:4) | Default 16:9 fallback, then detects natural ratio on load. Vertical images capped at 3:4 |
| `wide` | 16:9 | Fixed landscape ratio |
| `portrait` | 4:5 | Fixed tall ratio |
| `square` | 1:1 | Fixed square ratio |
| `small_portrait` | 3:4 | Fixed slightly-tall ratio |

### CONTENT_VIDEO

Inline video within a content card.

```json
{ "type": "CONTENT_VIDEO", "videoSrc": "https://example.com/clip.mp4", "posterSrc": "https://example.com/thumb.jpg" }
```

### CONTENT_SOCIAL

Social media quote or attribution. Renders with an avatar, name, and platform icon.

```json
{
  "type": "CONTENT_SOCIAL",
  "avatarSrc": "https://example.com/avatar.jpg",
  "name": "Jane Doe",
  "subtitle": "@janedoe",
  "source": "x"
}
```

Supported `source` values: `x`, `linkedin`, `instagram`, `facebook`, `threads`, `bluesky`.

### CONTENT_SUBTEXT

Smaller, muted text. Good for captions, credits, or footnotes.

```json
{ "type": "CONTENT_SUBTEXT", "text": "Source: Wikipedia, 2024" }
```

### CONTENT_CODE

Syntax-highlighted code block.

```json
{ "type": "CONTENT_CODE", "code": "console.log('hello world');", "language": "javascript" }
```

### CONTENT_QUIZ

Interactive quiz block. Displays a question with multiple-choice options. Users tap to answer and get immediate visual feedback (correct/incorrect).

```json
{
  "type": "CONTENT_QUIZ",
  "question": "What is the largest planet in our solar system?",
  "options": [
    { "label": "Mars", "correct": false },
    { "label": "Jupiter", "correct": true },
    { "label": "Saturn", "correct": false },
    { "label": "Neptune", "correct": false }
  ],
  "explanation": "Jupiter is the largest planet, with a mass more than twice that of all other planets combined."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | `string` | Yes | The question text |
| `options` | `QuizOption[]` | Yes (min 2) | Answer options |
| `options[].label` | `string` | Yes | Option text |
| `options[].correct` | `boolean` | Yes | Whether this option is correct |
| `explanation` | `string` | No | Explanation shown after answering |

Keep to 2–5 options to fit within card height constraints.

### CONTENT_BUTTON

A call-to-action button. Can open an external URL in the in-app browser, or navigate to a Fork, Feed, or User within the app.

```json
{
  "type": "CONTENT_BUTTON",
  "label": "Read the full article",
  "action": "url",
  "target": "https://example.com/article"
}
```

Internal navigation example:

```json
{
  "type": "CONTENT_BUTTON",
  "label": "Explore this fork",
  "action": "fork",
  "target": "fork-id-here"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | Yes | Button text |
| `action` | `string` | Yes | One of `url`, `fork`, `feed`, `user` |
| `target` | `string` | Yes | External URL (for `url`) or entity ID (for `fork`, `feed`, `user`) |

## Multi-Variant Cards

Cards with multiple variants display a horizontal pager - users swipe left/right between views. Good use cases:

- **Image + Detail**: First variant is a `FULL_IMAGE`, second is a `CONTENT` with context
- **Before / After**: Two `FULL_IMAGE` variants
- **Product showcase**: Multiple `FULL_IMAGE` variants with shared `backgroundSrc` and different foreground PNGs - background stays static while products swipe
- **Code + Explanation**: `CONTENT` with code blocks, then `CONTENT` with walkthrough

Example:

```json
{
  "_id": "concept-001",
  "feedId": "intro",
  "order": 0,
  "variants": [
    {
      "type": "FULL_IMAGE",
      "imageSrc": "https://example.com/cover.jpg",
      "title": "Variables",
      "subtitle": "Swipe for details →"
    },
    {
      "type": "CONTENT",
      "backgroundSrc": "https://example.com/code-bg.jpg",
      "blocks": [
        { "type": "CONTENT_TITLE", "title": "Variables" },
        { "type": "CONTENT_TEXT", "text": "A variable stores a value that can change..." },
        { "type": "CONTENT_CODE", "code": "let name = 'world';", "language": "javascript" }
      ]
    }
  ]
}
```

## Image Naming Conventions

When uploading images for a content set, use this naming pattern:

```
fork_YYYYMMDDHHMM.jpeg      - Fork cover image
1_YYYYMMDDHHMM.jpeg          - Feed 1 cover / card FULL_IMAGE
1b_YYYYMMDDHHMM.jpeg         - Feed 1 background (backgroundSrc for CONTENT cards)
1fg_YYYYMMDDHHMM.png         - Feed 1 foreground (imageSrc for two-layer FULL_IMAGE cards)
2_YYYYMMDDHHMM.jpeg          - Feed 2 cover / card FULL_IMAGE
2b_YYYYMMDDHHMM.jpeg         - Feed 2 background
2fg_YYYYMMDDHHMM.png         - Feed 2 foreground (optional)
...
10_YYYYMMDDHHMM.jpeg         - Feed 10 cover
10b_YYYYMMDDHHMM.jpeg        - Feed 10 background
```

- `fork` = the fork's cover image
- Numbered images (`1`, `2`, ...) = feed cover + first card's FULL_IMAGE variant for that feed
- `b` suffix = background image used as `backgroundSrc` on CONTENT and two-layer FULL_IMAGE variants
- `fg` suffix = foreground PNG with transparency, used as `imageSrc` on two-layer FULL_IMAGE cards (where `backgroundSrc` is also set). Always `.png` for transparency support
- Timestamp suffix (`YYYYMMDDHHMM`) keeps filenames unique across uploads
- All feeds, including quiz feeds, should have their own cover image and background

**backgroundSrc best practices:**
- Use one background image per feed for visual cohesion (all CONTENT cards in a feed share the same `backgroundSrc`)
- Every CONTENT variant should have a `backgroundSrc` for consistent visual atmosphere, including quiz cards
- The background renders full-bleed behind the glass card with a dark overlay for readability
- For FULL_IMAGE two-layer cards, use `backgroundSrc` for the backdrop and `imageSrc` for a transparent PNG foreground. When multiple FULL_IMAGE variants share the same `backgroundSrc`, the background stays static while foreground images swipe

## Image Hosting

Card images can be hosted anywhere — the server stores URLs, not files. Options:

- **Your own CDN** — S3 + CloudFront, Cloudflare R2, or any static host
- **Cloudflare R2** — pairs naturally with Workers, generous free tier
- **picsum.photos** — great for prototyping (`https://picsum.photos/seed/my-card/800/1200`)
- **Any public URL** — Unsplash, Imgur, or direct links

The included `scripts/upload-image.sh` script uploads a local file to S3 and returns the CDN URL:

```bash
bash scripts/upload-image.sh photo.jpg content/my-project/photo.jpg
# → https://{{CDN_DOMAIN}}/content/my-project/photo.jpg
```

Configure with environment variables: `S3_BUCKET` and `CDN_DOMAIN`.

## Uploading Content

The upload script (`scripts/upload.mjs`) pushes JSON content to your server via the admin API:

```bash
# Local dev server (default)
node scripts/upload.mjs manifests/my-content.json

# Production
ADMIN_KEY=your-secret node scripts/upload.mjs manifests/my-content.json https://your-worker.workers.dev
```

The script performs **idempotent upserts** — if a feed/card/fork already exists, it updates it. Safe to run repeatedly.

Auth: reads `ADMIN_KEY` from environment (falls back to `"admin"` for local dev).

After uploading, register your forks with the app-server using `npm run register` so they appear in the mobile app (see [README.md](README.md) for details).

## ID Conventions

- **Fork and Feed IDs**: kebab-case, namespaced by project (e.g., `hp-ps-privet-drive`, `tj-overview`)
- **Card IDs**: UUID v4 format (e.g., `9e990a75-3e3a-4dff-8dde-26663e711754`). Required for the app's like/reaction system.
- Keep IDs **stable** — they're referenced by forks and used in API URLs

## Minimal Template

A copy-pasteable starting point — one fork, one feed, two cards:

```json
{
  "forks": [
    {
      "_id": "my-fork",
      "title": "My First Fork",
      "description": "A sample fork to get started",
      "imageSrc": "https://picsum.photos/seed/my-fork/800/1200",
      "feedIds": ["my-feed"]
    }
  ],
  "feeds": [
    {
      "_id": "my-feed",
      "title": "Getting Started",
      "description": "Your first cards",
      "imageSrc": "https://picsum.photos/seed/my-feed/800/600",
      "mode": "sequential",
      "engagement": true
    }
  ],
  "cards": [
    {
      "_id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80",
      "feedId": "my-feed",
      "order": 0,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "https://picsum.photos/seed/card-001/800/1200",
          "title": "Welcome",
          "subtitle": "Your first card"
        }
      ]
    },
    {
      "_id": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091",
      "feedId": "my-feed",
      "order": 1,
      "variants": [
        {
          "type": "CONTENT",
          "blocks": [
            { "type": "CONTENT_TITLE", "title": "Hello World" },
            { "type": "CONTENT_TEXT", "text": "This is a rich content card. You can mix text, images, code, and more." },
            { "type": "CONTENT_CODE", "code": "console.log('hello');", "language": "javascript" }
          ]
        }
      ]
    }
  ]
}
```

Save as `manifests/my-content.json` and upload:

```bash
node scripts/upload.mjs manifests/my-content.json
```
