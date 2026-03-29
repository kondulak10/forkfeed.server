---
name: generate-push
description: Turn GitHub commits into swipeable forkfeed content - "The Fuck I Pushed"
user_invocable: true
---

# /generate-push

Turn GitHub commits into swipeable forkfeed content. One fork per repo, one feed per commit, 8 cards per feed. Built for "The Fuck I Pushed" - something to swipe before sleeping to see what happened in your codebase.

## How to use

The user says `/generate-push` or `/generate-push owner/repo` or `/generate-push /path/to/local/repo`. If a repo is passed inline, skip Question 1.

The skill runs in four phases: **(1) Ask --> (2) Fetch & Analyze --> (3) Generate Content --> (4) Images & Finalize**. No phase can be skipped.

---

## Phase 1 - Ask (2-3 questions)

Ask these questions using `AskUserQuestion`, one at a time.

### Question 1 - Repository

**"Which repository should I analyze?"**

No predefined options, free text. Prompt with examples:
- A GitHub URL: `https://github.com/vercel/next.js`
- Shorthand: `vercel/next.js`
- A local path: `C:\Users\janko\Desktop\my-project`

**Detection rules:**
- Contains `/` but no `\` or `:` --> GitHub shorthand (`owner/repo`)
- Contains `github.com` --> extract `owner/repo` from URL
- Contains `\` or starts with `/` or `C:` --> local path

If the user passed a repo with the command (e.g., `/generate-push vercel/next.js`), skip this and go to Question 2.

### Question 2 - Commits

**"Which commits should I turn into feeds?"**

Options:
- **Latest commit** (Recommended) - the most recent commit on the default branch
- **Last N commits** - process the last 2-10 commits (ask for N)
- **Specific SHA(s)** - paste one or more commit SHAs
- **Since date** - all commits since a date (e.g., "yesterday", "2026-03-25")

Default: latest commit.

### Question 3 - Images

**"How should I handle section images?"**

Options:
- **IT Scenes** (Recommended) - pre-made ghost-themed scene images matched to commit themes by tag and title relevance
- **Placeholders** - use picsum.photos placeholder URLs, instant but generic
- **AI-generated** - generate dark/neon code-themed images via Google Flow (slower, looks polished)
- **Skip images** - no FULL_IMAGE cover variants, cards start directly with CONTENT variants

### Hardcoded defaults (never asked)

| Parameter | Value |
|---|---|
| Sections | 8 per commit (Explain like I'm 5, The roast, Commit message decoded, The LinkedIn post, Statistics, Learning moment, Alternatives, Quiz) |
| Tone | Casual, fun, slightly irreverent ("The Fuck I Pushed" voice) |
| Code | Real code from the actual diff, never fabricated (except Alternatives section) |
| Mode | `sequential` for all feeds |
| Scroll direction | `vertical` for all feeds |

---

## Phase 2 - Fetch & Analyze

This phase extracts commit data directly from git. No web research agents needed, the diff IS the source material.

### Step 1 - Resolve Repository

**For GitHub repos** (shorthand or URL):

Verify access:
```bash
gh api repos/{owner}/{repo} --jq '.full_name'
```

Get the default branch:
```bash
gh api repos/{owner}/{repo} --jq '.default_branch'
```

**For local repos:**

Verify it's a git repo:
```bash
git -C "{path}" rev-parse --is-inside-work-tree
```

Get the default branch:
```bash
git -C "{path}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"
```

### Step 1b - Read Project Description

To generate a good fork title and description, read the project's documentation:

**For GitHub repos:**
```bash
# Try repo description first
gh api repos/{owner}/{repo} --jq '.description'

# Then try README (first 50 lines)
gh api repos/{owner}/{repo}/readme --jq '.content' | base64 -d | head -50

# Or CLAUDE.md if it exists
gh api repos/{owner}/{repo}/contents/CLAUDE.md --jq '.content' | base64 -d | head -50
```

**For local repos:**
```bash
# Check README, CLAUDE.md, package.json description
cat "{path}/README.md" 2>/dev/null | head -50
cat "{path}/CLAUDE.md" 2>/dev/null | head -50
```

Use whatever you find to write the fork `title` (project name, not owner/repo) and `description` (what the project IS, not what The Fuck I Pushed is). If nothing is found, infer from the codebase.

### Step 2 - Resolve Commits

Based on the user's answer to Question 2, get the list of commit SHAs:

**Latest commit:**
```bash
# GitHub
gh api repos/{owner}/{repo}/commits?sha={branch}&per_page=1 --jq '.[0].sha'

# Local
git -C "{path}" rev-parse HEAD
```

**Last N commits:**
```bash
# GitHub
gh api repos/{owner}/{repo}/commits?sha={branch}&per_page={N} --jq '.[].sha'

# Local
git -C "{path}" log -{N} --format='%H'
```

**Since date:**
```bash
# GitHub
gh api "repos/{owner}/{repo}/commits?sha={branch}&since={iso-date}" --jq '.[].sha'

# Local
git -C "{path}" log --since="{date}" --format='%H'
```

**Filter out merge commits** - skip any commit with more than one parent (merge commits are usually noise):
```bash
# GitHub: check parents array length
gh api repos/{owner}/{repo}/commits/{sha} --jq '.parents | length'

# Local
git -C "{path}" cat-file -p {sha} | grep -c '^parent'
```

If a merge commit is found, skip it silently unless it's the only commit, in which case process it anyway.

### Step 3 - Extract Commit Data

For each commit SHA, collect all data needed for content generation.

**GitHub repos:**

```bash
# Metadata (message, author, date)
gh api repos/{owner}/{repo}/commits/{sha} --jq '{
  sha: .sha,
  shortSha: (.sha[:7]),
  message: .commit.message,
  author: .commit.author.name,
  date: .commit.author.date,
  additions: .stats.additions,
  deletions: .stats.deletions,
  totalFiles: (.files | length)
}'

# Full diff
gh api repos/{owner}/{repo}/commits/{sha} -H "Accept: application/vnd.github.v3.diff"

# File list with stats
gh api repos/{owner}/{repo}/commits/{sha} --jq '.files[] | {filename, status, additions, deletions, patch}'
```

**Local repos:**

```bash
# Metadata
git -C "{path}" log -1 --format='{
  "sha": "%H",
  "shortSha": "%h",
  "message": "%s",
  "body": "%b",
  "author": "%an",
  "date": "%aI"
}' {sha}

# Stats
git -C "{path}" diff --stat {sha}^..{sha}

# Full diff
git -C "{path}" diff {sha}^..{sha}

# For the very first commit (no parent)
git -C "{path}" diff --root {sha}
```

**Detect languages** from file extensions in the diff:

| Extension | Language param |
|---|---|
| `.ts`, `.tsx` | `typescript` |
| `.js`, `.jsx` | `javascript` |
| `.py` | `python` |
| `.go` | `go` |
| `.rs` | `rust` |
| `.swift` | `swift` |
| `.kt`, `.kts` | `kotlin` |
| `.html`, `.htm` | `markup` |
| `.xml` | `markup` |
| `.css`, `.scss` | `css` |
| `.sh`, `.bash` | `bash` |
| `.json` | `json` |
| `.sql` | `bash` |
| `.yaml`, `.yml` | `bash` |
| `.md` | `bash` |
| Other | omit `language` param |

### Step 4 - Analyze the Diff

For each commit, analyze the raw diff and produce a structured breakdown for the 8 cards:

1. **Explain like I'm 5** - dead simple explanations of what was done and key technologies/features. No jargon, friendly tone.
2. **The roast** - sarcastic, funny take on the commit. Ironic observations, fake ratings/comments, "bug radar" cards poking at possible issues, missing tests, security concerns.
3. **Commit message, decoded** - translate the commit message into what the developer really meant, then escalate through absurd rewrites (corporate speak, Shakespearean, military briefing).
4. **The LinkedIn post** - absurdly over-the-top LinkedIn posts about this commit from different personas (hustle bro, thought leader, humble bragger).
5. **Statistics** - by-the-numbers breakdown. Files changed, lines added/deleted, languages, file lists grouped by area.
6. **Learning moment** - what technologies, libraries, frameworks, design patterns, algorithms appear? Explain them so the reader actually learns something. When should you use this tech? When should you NOT?
7. **Alternatives** - what other approaches could have been taken? What features could be added? What to consider next?
8. **Quiz** - generate 10-15 quiz questions about the commit (if enough substance). Test whether the reader understood what was pushed.

**Large commit handling** (>4000 lines in the diff):
- Summarize the full file list with stats
- Focus code snippets on the 5-10 most interesting/impactful files
- Group related file changes together by area
- Never dump the entire diff into cards, curate the highlights
- Note the full scope in the ELI5 section but keep other sections focused

### Step 5 - Report Summary

Show the user a brief summary before generating:

> "Analyzed commit `{shortSha}`: '{message}'"
> "{totalFiles} files changed, +{additions} -{deletions}, languages: {languages}"
> "Generating 8 cards..."

Proceed immediately to Phase 3. Do NOT wait for confirmation.

---

## Phase 3 - Generate Content

### Pre-generation Setup

Generate UUIDs for all planned cards:

```bash
node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\n')"
```

Replace `N` with the planned total card count. For a single commit: 8 cards (one per section). For 3 commits: 24 UUIDs. Generate extras, unused UUIDs are harmless.

### ID Naming Conventions

- **Fork ID**: `tfip-{owner}-{repo}` (e.g., `tfip-vercel-next-js`)
  - `tfip` prefix = "the fuck i pushed"
  - For local repos with no remote: `tfip-local-{dirname}` (e.g., `tfip-local-my-project`)
- **Feed ID**: `tfip-{owner}-{repo}-{7char-sha}` (e.g., `tfip-vercel-next-js-abc1234`)
  - Short SHA is always 7 lowercase hex chars
- **Card IDs**: UUID v4

All IDs must match regex `/^[a-z0-9-]+$/`.

### Output File

Write to `manifests/tfip-{owner}-{repo}.json`.

Before writing, check if the file already exists:
- **If it exists**: read it, identify which commits are already processed (match short SHA in feed IDs), skip duplicates, merge new feeds/cards, prepend new feedIds to the fork's array (newest first)
- **If it does not exist**: create fresh

### Fork Structure

One fork per repo, stored in a `"forks"` array (must be an array, even with one fork, to match the upload script):

```json
"forks": [
  {
    "_id": "tfip-{owner}-{repo}",
    "title": "<Project name from README/CLAUDE.md>",
    "description": "<one-line description of what the project IS, sourced from README/CLAUDE.md>",
    "imageSrc": "<scene-image-url or placeholder>",
    "feedIds": ["tfip-{owner}-{repo}-{sha1}", "tfip-{owner}-{repo}-{sha2}"],
    "actionLabel": "View on GitHub",
    "actionUrl": "https://github.com/{owner}/{repo}"
  }
]
```

**IMPORTANT**: The top-level key MUST be `"forks"` (plural array), NOT `"fork"` (singular object). The upload script destructures `{ forks = [] }` and will silently skip a singular `"fork"` key.

- `title`: the project's actual name from README/CLAUDE.md, not the raw `owner/repo`. E.g., "Forkfeed" not "kondulak10/forkfeed.app".
- `description`: a concise description of what the project IS, sourced from README/CLAUDE.md. Do NOT prefix with "The Fuck I Pushed -". E.g., "A TikTok-style content app replacing doom scrolling with feeds you actually control."

For local repos without a GitHub remote, set `actionLabel` to `"Open Repository"` and `actionUrl` to `""`.

Feed order in `feedIds`: **newest commit first** (most recent at top of list).

### Feed Structure (one per commit)

```json
{
  "_id": "tfip-{owner}-{repo}-{shortSha}",
  "title": "<human-readable summary of the commit, max 60 chars>",
  "description": "<Mon DD>: <one-line description of what this commit does and why it matters>",
  "imageSrc": "<scene-image-url or placeholder>",
  "mode": "sequential",
  "scrollDirection": "vertical",
  "engagement": true
}
```

- `title`: a human-readable summary of what the commit does, NOT the raw commit message. Write it like a short headline: "Feed player gets a proper ending", "Buttons everywhere", "Glass effect compatibility fix". Max 60 chars.
- `description`: starts with the date and a colon (e.g., "Mar 26:"), then a descriptive sentence about the commit's impact. Do NOT include SHA, author, or raw stats here, focus on meaning.
- `imageSrc`: In IT Scenes mode, use Card 0's (ELI5) FULL_IMAGE scene image URL. In placeholder mode, use the picsum URL. In AI-generated mode, each feed gets its own generated image

### Cards - The 8-Card Multicard Structure

Each feed generates exactly **8 cards** (one per section). Each card is a **multicard** with variants:

- **variant[0]**: Always a `FULL_IMAGE` variant with `imageSrc`, `title` (section name), and `subtitle` (hook description, max 200 chars). This is what the user sees when scrolling down. It acts as the section cover.
- **variant[1+]**: `CONTENT` detail variants. Users swipe RIGHT to read these. Most detail variants start with `CONTENT_IMAGE` (wide), except Cards 2-3 which use `CONTENT_SOCIAL`, and Card 7 (Quiz) where `CONTENT_IMAGE` is optional.

Users scroll DOWN between cards and swipe RIGHT within a card. Scrolling down always shows a FULL_IMAGE cover first. Swiping right reveals the detail content.

```
Card 0: "Explain like I'm 5"         -> dead simple explanations when swiping right
Card 1: "The roast"                  -> humor + bug radar when swiping right
Card 2: "Commit message, decoded"    -> absurd rewrites of the commit message
Card 3: "The LinkedIn post"          -> over-the-top LinkedIn posts about the commit
Card 4: "Statistics"                 -> by-the-numbers breakdown when swiping right
Card 5: "Learning moment"            -> educational explainers when swiping right
Card 6: "Alternatives"               -> other approaches when swiping right
Card 7: "Quiz"                       -> quiz questions when swiping right
```

**IMPORTANT**: Use sentence case for ALL titles - "Learning moment" NOT "Learning Moment", "Explain like I'm 5" NOT "Explain Like I'm 5".

**CRITICAL - Card vs. Variant boundaries (do NOT confuse these):**
- Each feed has exactly **8 cards**. Users scroll DOWN between cards. Each card = one section (ELI5, Roast, Decoded, LinkedIn, Stats, Learning, Alternatives, Quiz).
- Each card has multiple **variants**. Users swipe RIGHT between variants. variant[0] = FULL_IMAGE section cover, variant[1+] = detail content within that section.
- A new section = a **new card** (different `order` value, different UUID). NEVER put section content into another section's card.
- More detail within a section = more **variants** within the same card (same `_id`, same `order`). NEVER create a new card for what should be a variant.
- If you are writing about ELI5 explanations, ALL of those go into Card 0's variants. If you are writing roast content, ALL of that goes into Card 1's variants. Never mix sections across cards.

### Background image rules

Every card's CONTENT detail variants (variant[1+]) MUST have `backgroundSrc`. The FULL_IMAGE variant (variant[0]) may optionally use `backgroundSrc` for a two-layer effect (background + foreground PNG), but this is not required for the push format. The rules:

- **One background per card**: each card (0-7) uses ONE background image for ALL its CONTENT detail variants (variant[1+]). All detail variants within a card share the same `backgroundSrc`.
- **Unique across cards**: each of the 8 cards must use a DIFFERENT background image. No two cards in a feed share a background.
- **8 unique BGs per feed**: pick 8 unique BGs from the available pool (one per card).

**CDN_DOMAIN resolution:** URLs in `permanent_content/` files use `{{CDN_DOMAIN}}` as a placeholder. Read `CDN_DOMAIN` from `.dev.vars` and replace `{{CDN_DOMAIN}}` with its value when constructing image URLs. If `CDN_DOMAIN` is not set, ask the user for their CDN domain before proceeding.

**In IT Scenes mode**, select 8 unique BG images from `permanent_content/it-scenes-index.md` (BG 1-30 section). Match each card's section theme to BG tags:

| Section (Card) | Primary BG candidates | Fallback |
|---|---|---|
| ELI5 (0) | BG 10 (Night coding), BG 27 (Coffee) | BG 21 (Hackathon) |
| The roast (1) | BG 11 (Meme/irony), BG 1 (Error) | BG 20 (Legacy code) |
| Commit message, decoded (2) | BG 20 (Legacy code), BG 11 (Meme/irony) | BG 27 (Coffee) |
| The LinkedIn post (3) | BG 25 (Startup hustle), BG 24 (Imposter syndrome) | BG 21 (Hackathon) |
| Statistics (4) | BG 9 (Data), BG 3 (Infrastructure) | BG 16 (Data science) |
| Learning moment (5) | Match technology in the commit | BG 2 (Code/terminal) |
| Alternatives (6) | BG 25 (Startup hustle), BG 30 (Zen) | BG 22 (Open source) |
| Quiz (7) | BG 18 (QA testing), BG 5 (Debug) | BG 7 (Security) |

When the commit's primary language is detected, prefer language-specific BGs: BG 12 (JavaScript), BG 13 (Python), BG 14 (Rust) for the Learning moment card.

If a preferred BG is already taken by another card, use the fallback or another thematically appropriate BG. Uniqueness across cards takes priority over thematic matching.

**In Placeholder/AI-generated mode**, use Unsplash or picsum.photos URLs but still ensure each card has a unique `backgroundSrc` URL shared across all its CONTENT detail variants.

### variant[0] structure (FULL_IMAGE cover)

Every card's variant[0] is a `FULL_IMAGE` variant. This is what the user sees when scrolling down through the feed.

```json
{
  "type": "FULL_IMAGE",
  "imageSrc": "<scene-image-url>",
  "title": "<section name in sentence case, max 60 chars>",
  "subtitle": "<hook description that makes you want to swipe right, max 200 chars>"
}
```

- `imageSrc`: In IT Scenes mode, use a scene image from `content/it-scenes-lookup.md` (scene images 1-200) matched by tag and title relevance to the section content. Each card MUST use a different scene image for its cover, and detail variants MUST use different images from the cover. We have 200 images, use the variety. In other modes, use the appropriate image URL.
- `title`: the section name in sentence case (e.g., "Explain like I'm 5", "The roast", "Statistics").
- `subtitle`: a short hook that makes the user want to swipe right for details. Max 200 characters. Keep it punchy and cheeky. Good: "14 files and 563 lines to change how a background fades. Let's talk." Bad: "See the details."

### variant[1+] structure (detail variants)

All CONTENT detail variants within a card share the same `backgroundSrc`. The FULL_IMAGE cover (variant[0]) typically does not use `backgroundSrc` in the push format, but it supports the field for two-layer compositions when needed.

```json
{
  "type": "CONTENT",
  "backgroundSrc": "<background-url>",
  "blocks": [
    { "type": "CONTENT_IMAGE", "imageSrc": "<theme-image-url>", "sizing": "wide" },
    { "type": "CONTENT_TITLE", "title": "<heading in sentence case>" },
    { "type": "CONTENT_TEXT", "text": "<50-200 words>" },
    { "type": "CONTENT_CODE", "code": "<real code>", "language": "<lang>" },
    { "type": "CONTENT_SUBTEXT", "text": "<optional protip or aside>" }
  ]
}
```

**Block rules:**
- Every CONTENT variant MUST have `CONTENT_TITLE` as the first block after any image/social block, in **sentence case** ("Feature detection pattern" not "Feature Detection Pattern")
- `CONTENT_IMAGE` with `"sizing": "wide"` is the default first block in most detail variants
- **Exceptions to CONTENT_IMAGE:**
  - Cards 2-3 (Decoded, LinkedIn): use `CONTENT_SOCIAL` instead of `CONTENT_IMAGE` in detail variants
  - Card 7 (Quiz): no `CONTENT_IMAGE`, quiz variants start directly with `CONTENT_TITLE`
- `CONTENT_TEXT`: 50-200 words per block. Short paragraphs. Use `\n\n` for breaks.
- `CONTENT_CODE`: real code from the diff, 5-20 lines, correct `language` param. Strip diff `+`/`-` prefixes. Optional, omit for conceptual content.
- `CONTENT_SUBTEXT`: optional, use for protips or asides.
- `CONTENT_QUIZ`: ONLY in Card 7 (Quiz). Needs `question`, `options` (array of 4, each with `label` + `correct`, exactly one true), and `explanation`.
- `CONTENT_BUTTON`: ONLY in Card 5 (Learning moment) detail variants. Must be the LAST block. Format: `{ "type": "CONTENT_BUTTON", "label": "Google it", "action": "url", "target": "https://www.google.com/search?q=..." }`
- `CONTENT_SOCIAL`: ONLY in Cards 2-3 detail variants. Replaces `CONTENT_IMAGE` at the top. Fields: `avatarSrc`, `name`, `subtitle`, `source` (`"linkedin"`, `"x"`, `"threads"`).
- No empty fields - omit optional fields entirely if not used.
- **ASCII only** - never use `--` or em dashes, use `-`, `:`, or `,` instead. Use regular `"` for quotes, no smart quotes or non-ASCII characters.

### Stats as code blocks

Whenever content looks like structured data - lines changed, file counts, language breakdowns - use `CONTENT_CODE` instead of `CONTENT_TEXT`. This applies to stats variants in the Statistics section.

---

### JSON structure reference

This is the complete JSON structure for a single commit. Every feed follows this exact shape. Use this as the authoritative reference when generating content.

```json
{
  "forks": [
    {
      "_id": "tfip-{owner}-{repo}",
      "title": "Project Name",
      "description": "What the project is (not what TFIP is).",
      "imageSrc": "<same as card 0 FULL_IMAGE imageSrc>",
      "feedIds": ["tfip-{owner}-{repo}-{7char-sha}"],
      "actionLabel": "View on GitHub",
      "actionUrl": "https://github.com/{owner}/{repo}"
    }
  ],
  "feeds": [
    {
      "_id": "tfip-{owner}-{repo}-{7char-sha}",
      "title": "Human-readable commit summary",
      "description": "Mar 26: What this commit does and why it matters.",
      "imageSrc": "<same as card 0 FULL_IMAGE imageSrc>",
      "mode": "sequential",
      "scrollDirection": "vertical",
      "engagement": true
    }
  ],
  "cards": [
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 0,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "Explain like I'm 5",
          "subtitle": "Hook that makes you swipe right. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-A>",
          "blocks": [
            { "type": "CONTENT_IMAGE", "imageSrc": "<scene-image>", "sizing": "wide" },
            { "type": "CONTENT_TITLE", "title": "Detail variant title" },
            { "type": "CONTENT_TEXT", "text": "ELI5 explanation..." }
          ]
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-A>",
          "blocks": [
            { "type": "CONTENT_IMAGE", "imageSrc": "<scene-image>", "sizing": "wide" },
            { "type": "CONTENT_TITLE", "title": "Another ELI5 angle" },
            { "type": "CONTENT_TEXT", "text": "More explanation..." }
          ]
        }
      ]
    },
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 1,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "The roast",
          "subtitle": "Hook subtitle. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-B>",
          "blocks": [
            { "type": "CONTENT_IMAGE", "imageSrc": "<scene-image>", "sizing": "wide" },
            { "type": "CONTENT_TITLE", "title": "Roast detail" },
            { "type": "CONTENT_TEXT", "text": "Sarcastic take..." }
          ]
        }
      ]
    },
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 2,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "Commit message, decoded",
          "subtitle": "Hook subtitle. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-C>",
          "blocks": [
            { "type": "CONTENT_SOCIAL", "avatarSrc": "<scene-image>", "name": "Dev Name", "subtitle": "Persona subtitle", "source": "x" },
            { "type": "CONTENT_TITLE", "title": "What you meant" },
            { "type": "CONTENT_TEXT", "text": "Translation..." },
            { "type": "CONTENT_CODE", "code": "original commit message", "language": "bash" }
          ]
        }
      ]
    },
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 3,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "The LinkedIn post",
          "subtitle": "Hook subtitle. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-D>",
          "blocks": [
            { "type": "CONTENT_SOCIAL", "avatarSrc": "<scene-image>", "name": "Chad Gitpush", "subtitle": "10x Engineer | Building in Public", "source": "linkedin" },
            { "type": "CONTENT_TITLE", "title": "The hustle bro" },
            { "type": "CONTENT_TEXT", "text": "LinkedIn post..." },
            { "type": "CONTENT_SUBTEXT", "text": "47 reactions, 12 comments" }
          ]
        }
      ]
    },
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 4,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "Statistics",
          "subtitle": "Hook subtitle. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-E>",
          "blocks": [
            { "type": "CONTENT_IMAGE", "imageSrc": "<scene-image>", "sizing": "wide" },
            { "type": "CONTENT_TITLE", "title": "By the numbers" },
            { "type": "CONTENT_CODE", "code": "Files changed:  14\nAdditions:     +563\nDeletions:     -161", "language": "bash" }
          ]
        }
      ]
    },
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 5,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "Learning moment",
          "subtitle": "Hook subtitle. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-F>",
          "blocks": [
            { "type": "CONTENT_IMAGE", "imageSrc": "<scene-image>", "sizing": "wide" },
            { "type": "CONTENT_TITLE", "title": "Technology explainer" },
            { "type": "CONTENT_TEXT", "text": "What it is and when to use it..." },
            { "type": "CONTENT_BUTTON", "label": "Google it", "action": "url", "target": "https://www.google.com/search?q=..." }
          ]
        }
      ]
    },
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 6,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "Alternatives",
          "subtitle": "Hook subtitle. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-G>",
          "blocks": [
            { "type": "CONTENT_IMAGE", "imageSrc": "<scene-image>", "sizing": "wide" },
            { "type": "CONTENT_TITLE", "title": "Alternative approach" },
            { "type": "CONTENT_TEXT", "text": "What else could have been done..." }
          ]
        }
      ]
    },
    {
      "_id": "<uuid>",
      "feedId": "tfip-{owner}-{repo}-{7char-sha}",
      "order": 7,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "<scene-image>",
          "title": "Quiz",
          "subtitle": "Hook subtitle. Max 200 chars."
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "<bg-image-H>",
          "blocks": [
            { "type": "CONTENT_TITLE", "title": "Question 1" },
            { "type": "CONTENT_QUIZ", "question": "What did this commit change?", "options": [
              { "label": "Option A", "correct": false },
              { "label": "Option B", "correct": true },
              { "label": "Option C", "correct": false },
              { "label": "Option D", "correct": false }
            ], "explanation": "Why B is correct..." }
          ]
        }
      ]
    }
  ]
}
```

**Key structural rules visible in the JSON above:**

1. Every card's `variant[0]` is `FULL_IMAGE` (scroll down = see image cover), `variant[1+]` are `CONTENT` (swipe right = read details)
2. All `CONTENT` variants within the same card share the same `backgroundSrc` (bg-image-A for all of card 0's detail variants, bg-image-B for card 1, etc.)
3. Each card uses a unique `backgroundSrc` - no two cards share a BG image
4. Cards 2-3 (Decoded, LinkedIn) use `CONTENT_SOCIAL` instead of `CONTENT_IMAGE` in detail variants
5. Card 5 (Learning) detail variants end with `CONTENT_BUTTON`
6. Card 7 (Quiz) detail variants have no `CONTENT_IMAGE`, start with `CONTENT_TITLE` + `CONTENT_QUIZ`
7. Fork and feed `imageSrc` reuse Card 0's FULL_IMAGE `imageSrc`
8. Each card shows only 1-2 detail variants above for brevity - actual cards have 2-8 detail variants per the variant counts table

---

#### Card 0: Explain like I'm 5 (order 0)

Dead simple explanations of what was done and key technologies/features. No jargon allowed.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "Explain like I'm 5" and subtitle previewing what this section covers
- 3-6 detail variants:
  - Each variant: wide image + ELI5 title + description + bg image
  - Explain each major change as if teaching someone with zero technical background
  - Use analogies and simple language
  - Break down complex changes into bite-sized pieces
- Tone: friendly, accessible, and playful. Like explaining to a smart non-developer friend while both of you are slightly tipsy. Use absurd analogies, make it fun.

---

#### Card 1: The roast (order 1)

Ironic card making fun of the commits, technology, commit size. Includes fake ratings/comments and a "Bug radar" sub-section. Placed early to hook the reader with humor.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "The roast" and subtitle like "Let's talk about what you just did" or "Time for some brutal honesty"
- 3-6 detail variants mixing these types:
  - **Sarcastic observations**: roast the code, commit size, naming choices, tech decisions. Reference actual code from the diff for maximum impact
  - **Fake ratings/comments**: made-up code review comments, star ratings, fake Glassdoor reviews of the codebase
  - **Bug radar**: poke at possible issues - missing tests, security concerns, edge cases, potential bugs. Constructive but wrapped in humor. Use `CONTENT_SUBTEXT` for protips
- Tone: standup comedy about code. Think code review from your funniest colleague
- MUST be funny, not mean-spirited. Self-deprecating humor works well
- Swearing is encouraged - this is "The Fuck I Pushed" after all
- Examples: "82 lines for a Go Back button. Impressive commitment.", "17 files in one commit. You know git supports branches, right?", "No tests. Bold strategy, Cotton."

---

#### Card 2: Commit message, decoded (order 2)

Translate the commit message into what the developer REALLY meant, then escalate through increasingly absurd rewrites.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "Commit message, decoded" and subtitle like "What you wrote vs what you meant" or "Lost in translation"
- 2-4 detail variants, each a different "translation":
  - **What you meant**: the honest version. Show the original commit message in CONTENT_CODE, then the real translation below. "fix: update styles" becomes "I mass-replaced every color because the designer changed their mind again at 11pm and I want to go to bed"
  - **Corporate speak**: rewrite as a corporate memo. "Per our strategic alignment initiative, legacy presentation layer assets have been deprecated in favor of a next-generation visual identity framework..."
  - **Shakespearean** (optional): dramatic rewrite. "O wretched CSS, thy colors didst offend mine eyes, and so with heavy hand I struck thee down..."
  - **Military briefing** (optional): "SITREP 0300 hours. Package bravo-uniform-golf neutralized. Casualties: 14 lines. Collateral: none. Awaiting QA clearance."
- Detail variant structure: use `CONTENT_SOCIAL` instead of `CONTENT_IMAGE` at the top of each detail variant to give the "translator" a persona. Pick a funny name and relevant avatar image for each style:
  - What you meant: use a relatable dev name. Source: `"x"` or `"threads"`
  - Corporate speak: use a corporate-sounding name ("Director of Strategic Commits"). Source: `"linkedin"`
  - Shakespearean: use a theatrical name ("Sir Pushalot the Third"). Source: `"x"`
  - Military briefing: use a military title ("Sgt. Merge Conflict"). Source: `"x"`
- After the CONTENT_SOCIAL block: CONTENT_TITLE with translation style name + CONTENT_TEXT with the rewrite + CONTENT_CODE showing the original commit message
- Tone: escalating absurdity. Start grounded (honest version), end ridiculous. Maximum cheekiness, this is pure comedy
- The humor comes from the CONTRAST between the terse commit message and the over-the-top rewrites
- Keep it specific to the actual commit, generic translations are not funny

---

#### Card 3: The LinkedIn post (order 3)

Generate absurdly over-the-top LinkedIn posts about this commit. Each variant is a different persona writing about the same mundane code change as if it were a career-defining moment.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "The LinkedIn post" and subtitle like "Your commit, LinkedIn-ified" or "Time to update your personal brand"
- 2-4 detail variants, each a different LinkedIn persona:
  - **The hustle bro**: "Day 847 of my coding journey. Today I mass-renamed 3 variables. Most people won't do the work. That's why most people fail. Like if you agree. #grindset #10x #buildinpublic"
  - **The thought leader**: "Hot take: we don't have a technical debt problem. We have a COURAGE problem. Today I had the courage to refactor a CSS file. Here's what I learned about leadership (thread)..."
  - **The humble bragger**: "I'm not usually one to share achievements, but after my team's 8-month effort (just me, at 2am, solo) to ship this 14-line fix, I'm feeling grateful. #blessed #engineering"
  - **The career pivoter** (optional): "After 6 months of bootcamp, I finally understand what a variable is. Today I changed one. Tears in my eyes right now. To everyone thinking about switching careers: DO IT."
- Detail variant structure: use `CONTENT_SOCIAL` instead of `CONTENT_IMAGE` at the top of each detail variant. This is perfect for LinkedIn posts since it shows a profile avatar and name. Always use `"source": "linkedin"` for these. Give each persona a funny name and subtitle:
  - The hustle bro: name "Chad Gitpush", subtitle "10x Engineer | Building in Public | DMs Open"
  - The thought leader: name "Alexandra Middleware", subtitle "VP of Forward Thinking at TechCorp"
  - The humble bragger: name "Dave 'Shipping' Johnson", subtitle "Just a humble engineer doing humble things"
  - The career pivoter: name "Sarah Bootcamp", subtitle "Former barista, current code warrior"
  - Use scene images from IT Scenes for `avatarSrc` (the circular profile photo)
- After the CONTENT_SOCIAL block: CONTENT_TITLE with persona name + CONTENT_TEXT with the full LinkedIn post
- Include fake engagement at the bottom of the text using CONTENT_SUBTEXT: reactions count, comments like "Congrats! Well deserved!" or "This. So much this."
- Tone: affectionate parody, maximum cheekiness. Everyone has seen these posts. The humor is recognition, not mockery
- MUST reference the ACTUAL commit content, specific files, specific changes. Generic LinkedIn parody is not funny. "I renamed a database column" is funnier than "I wrote code"

---

#### Card 4: Statistics (order 4)

By-the-numbers breakdown of the commit.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "Statistics" and subtitle with overview of the numbers
- 3-5 detail variants:
  - Always include "By the numbers": CONTENT_CODE with stats (files changed, lines added/deleted, languages, branch name)
  - Always include "Files touched": CONTENT_CODE with grouped file list in `bash` language
  - "What changed where": group changes by area/package for monorepos
  - Other stats as warranted by the commit (e.g., biggest file, most deleted lines, language breakdown)
- Use `CONTENT_CODE` for all structured data
- Tone: deadpan humor meets data. Present the numbers straight but add dry observations. "17 files touched, which is either a refactor or a cry for help." Make the reader chuckle at the data.

---

#### Card 5: Learning moment (order 5)

Educational section - explain the technological choices so the person actually learns something. What is the tech, why was it used, when should/shouldn't you use it.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "Learning moment" and subtitle like "X new technologies and principles to learn"
- 3-8 detail variants, one per technology/pattern/algorithm:
  - **What it is**: explain the technology like teaching someone. "D1 is Cloudflare's serverless SQL database that runs at the edge..."
  - **Why it's used here**: how this commit uses the technology, with code examples
  - **When to use / not use**: real-world reasoning about when this tech choice makes sense and when it doesn't. Give the reader practical knowledge they can apply
  - **Real-world analogy**: if the concept is abstract, compare it to something concrete
- Sentence case in titles: "Feature detection pattern" not "Feature Detection Pattern"
- Include `CONTENT_CODE` where it helps explain the pattern
- This section should make the reader feel smarter after reading it
- Every detail variant (variant[1+]) MUST end with a `CONTENT_BUTTON` linking to a Google search for the topic:
  ```json
  { "type": "CONTENT_BUTTON", "label": "Google it", "action": "url", "target": "https://www.google.com/search?q=<url-encoded-topic>" }
  ```
  Where `<url-encoded-topic>` is the variant's technology/pattern title, URL-encoded (spaces become `+`). Example: for a variant titled "Feature detection pattern", the target is `https://www.google.com/search?q=Feature+detection+pattern`. The button must be the LAST block in the variant's blocks array.
- Tone: teach with personality. No textbook energy. Drop in playful asides, sarcastic-but-affectionate observations about the tech. "D1 is Cloudflare's serverless SQL database. Yes, another database. The world needed one more."

---

#### Card 6: Alternatives (order 6)

Alternative approaches, features to consider, what-ifs.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "Alternatives" and subtitle like "X alternative approaches to consider"
- 3-6 detail variants mixing these types:
  - **Alternative approaches**: "instead of X, you could Y" - not criticism, just options. Show hypothetical code
  - **Feature ideas**: what could be built on top of this? What's the natural next step?
  - **What to consider**: tradeoffs, scaling concerns, design decisions worth revisiting
- Synthesized/hypothetical code IS allowed (this is the section where non-diff code is permitted)
- Frame constructively with a wink - these are ideas, not complaints. "Look, what you did works. But have you considered not doing that?"

---

#### Card 7: Quiz (order 7)

"Do you even know what you pushed?" - interactive quiz testing understanding of the commit.

**Guidelines:**
- Cover (variant[0]): FULL_IMAGE with title "Quiz" and subtitle like "Do you even know what you pushed?" or "Pop quiz, hotshot"
- **10-15 detail variants** (if the commit has enough substance), each containing a `CONTENT_QUIZ` block:
  - Each quiz has a `question`, 4 `options` (one `correct: true`), and an `explanation`
  - Questions should test real understanding, not trivia: "What pattern does the new auth middleware use?", "Why was the database query changed from X to Y?"
  - Mix difficulty: 3-4 easy (anyone reading the summary would know), 4-6 medium (need to understand the code), 3-5 hard (deep technical understanding)
  - Explanations should teach, not just say "correct" - reinforce the learning from the Learning moment section
  - Cover every significant change in the commit - if 10+ files changed, there should be questions touching different areas
- Tone: quiz show host energy. Questions should be entertaining to read, not dry. "What crime against clean code does line 47 commit?" is better than "What pattern is used on line 47?"
- Quiz variant structure:

```json
{
  "type": "CONTENT",
  "backgroundSrc": "<detail-background-url>",
  "blocks": [
    { "type": "CONTENT_TITLE", "title": "Question 1" },
    {
      "type": "CONTENT_QUIZ",
      "question": "What does the new middleware check before allowing requests?",
      "options": [
        { "label": "API key in the Authorization header", "correct": true },
        { "label": "Session cookie validity", "correct": false },
        { "label": "IP address whitelist", "correct": false },
        { "label": "OAuth token expiration", "correct": false }
      ],
      "explanation": "The middleware checks for a Bearer token in the Authorization header and compares it against the ADMIN_KEY environment variable."
    }
  ]
}
```

---

### Variant counts per section

| Section | Cover (FULL_IMAGE) | Detail (CONTENT) | Total variants |
|---|---|---|---|
| Explain like I'm 5 | 1 | 3-6 | 4-7 |
| The roast | 1 | 3-6 | 4-7 |
| Commit message, decoded | 1 | 2-4 | 3-5 |
| The LinkedIn post | 1 | 2-4 | 3-5 |
| Statistics | 1 | 3-5 | 4-6 |
| Learning moment | 1 | 3-8 | 4-9 |
| Alternatives | 1 | 3-6 | 4-7 |
| Quiz | 1 | 10-15 | 11-16 |
| **Total** | - | - | **8 cards, 35-62 variants** |

### Tone and Voice

The writing should feel like your funniest, smartest friend reviewing your code:

- Casual, cheeky, and technically accurate
- Every section should have personality - not just The Roast. Even Statistics should have a wink
- Slightly irreverent throughout, matching "The Fuck I Pushed" branding
- Educational without being condescending - you can teach and be funny at the same time
- Use "you" directly: "you added...", "your code does...", "you went with..."
- Short paragraphs, no walls of text
- Humor is the default, not the exception. Dry wit, ironic observations, playful jabs welcome everywhere
- Use contractions: "it's", "you're", "doesn't"
- Swear occasionally for emphasis if it fits naturally - this is "The Fuck I Pushed" after all
- The Roast is the funniest section. Other sections should be funny-adjacent: think amused, not neutral

**Cheekiness scale by section:**

| Section | Cheekiness level |
|---|---|
| Explain like I'm 5 | Medium - playful analogies, slightly absurd comparisons, welcoming |
| The roast | Maximum - full standup comedy, swearing welcome |
| Commit message, decoded | Maximum - escalating absurdity, commitment to the bit |
| The LinkedIn post | Maximum - affectionate cringe, peak LinkedIn parody |
| Statistics | Medium - dry wit, deadpan observations about the numbers |
| Learning moment | Medium - teach with personality, not like a textbook |
| Alternatives | Medium - frame suggestions with a bit of snark |
| Quiz | Medium-high - quiz questions should be entertaining to read |

**Good examples:**
- "So you slapped a WebSocket server onto this thing. Bold move. Let's see what that actually does."
- "22 files in one commit. Someone's feeling confident today."
- "This is a classic middleware chain - each function hands off to the next, like a bucket brigade where half the buckets are on fire."
- "You could've gone with SSE here. Simpler, less overhead, and honestly? Probably fine for this use case. But where's the fun in that?"
- "No tests for the new route. Living dangerously, we respect it."
- "42 lines added, 3 deleted. The codebase just gained weight."

**Bad examples (too formal/dry):**
- "The developer has implemented a WebSocket server utilizing the ws library."
- "It is recommended to consider Server-Sent Events as an alternative."
- "This commit modifies 22 files across the repository."

### Code Snippet Rules

- Cards 0-5: All `CONTENT_CODE` must use REAL code from the actual diff, never fabricated (Cards 2-3 may also include the original commit message in CONTENT_CODE)
- Card 6 (Alternatives): synthesized code IS allowed since it shows hypothetical alternatives
- Card 7 (Quiz): no code blocks needed, quiz questions reference the code conceptually
- Show the most interesting/relevant parts, not everything
- For added lines: show the new code (strip `+` prefix from diff)
- For context: you can show surrounding unchanged code from the diff
- Keep snippets to 5-20 lines
- Always include the `language` parameter for syntax highlighting
- If showing a file path in `CONTENT_TEXT`, use backticks: `src/index.ts`

---

## Phase 4 - Images & Finalize

### Option A: IT Scenes (default)

Use pre-made ghost-themed scene images and background images from `permanent_content/it-scenes-index.md` (IMAGE 1-200 and BG 1-30). Read this file and select images by matching against the **full generated card content** (not just tags/titles). Remember to resolve `{{CDN_DOMAIN}}` in URLs using the value from `.dev.vars`.

**Step 1 - Determine commit tags**

From the diff analysis in Phase 2, identify which tags apply to this commit:
- `deploy` - CI/CD, deployment, infrastructure changes
- `git` - version control, branching, merging, PRs
- `disaster` - bugs, crashes, breaking changes, outages
- `debug` - debugging, logging, error handling, fixes
- `hype` - new tech, trendy tools, AI, over-engineering
- `victory` - successful launches, milestones, clean refactors
- `beginner` - simple changes, first contributions, basic patterns
- `language` - language-specific features, syntax, idioms
- `lifestyle` - developer life, workflows, tooling
- `workplace` - team dynamics, process, meetings
- `sarcastic` - ironic situations, over-complication, tech debt
- `general` - broad applicability, common patterns

**Step 2 - Select scene images (IMAGE 1-200)**

From the Scene Images table, pick **16-25 unique images** per feed (we have 200 images, use the variety):

**Matching strategy - use the full card content, not just tags:**
By Phase 4, all card content is already generated. For each image slot, read the card's actual variant content (titles, text blocks, code topics, analogies, roast jokes, quiz questions) and match against the image's **title + description + tags** holistically. An image titled "Developer mass-renames variables at 3am" is a better match for a roast variant about renaming than a generic `sarcastic` tag match would find.

- **Step A**: Narrow candidates by tag overlap with the commit's tags (coarse filter)
- **Step B**: Among candidates, rank by **semantic similarity to the actual variant content** - the text, code, and topics in the specific variant or card you're assigning the image to. The image title and description carry more signal than tags alone
- **Step C**: Assign the best match, then remove it from the pool so it can't be reused

**Uniqueness rules:**
- Each of the 8 cards MUST have a different scene image for its FULL_IMAGE cover variant (8 unique cover images)
- **CRITICAL: Detail variant `CONTENT_IMAGE` images MUST be different from their card's FULL_IMAGE cover image.** Never reuse the cover image inside the same card's detail variants. Pick fresh scene images from the gallery for each detail variant's `CONTENT_IMAGE`
- No two detail variants within the same card should share a `CONTENT_IMAGE` either - maximize visual variety

**Tag preferences as fallback** (use when content matching produces ties):
  - **ELI5**: prefer `beginner`, `general`, `lifestyle` tagged images
  - **The roast**: prefer `disaster`, `sarcastic`, `debug` tagged images
  - **Commit message, decoded**: prefer `sarcastic`, `lifestyle`, `workplace` tagged images
  - **The LinkedIn post**: prefer `workplace`, `hype`, `lifestyle` tagged images
  - **Statistics**: prefer `general` or technology-relevant images
  - **Learning moment**: match to the specific technologies in the commit
  - **Alternatives**: prefer `general`, `hype` tagged images
  - **Quiz**: prefer `debug`, `victory` tagged images

**Step 3 - Select background images (BG 1-30)**

Pick 8 unique BG images (one per card 0-7) from the BG 1-30 section of `permanent_content/it-scenes-index.md`. Use the section-to-BG mapping from the "Background image rules" section. Match by tag overlap and mood. Ensure no two cards share a BG.

**Step 4 - Assign to content**

- Fork `imageSrc`: use Card 0's FULL_IMAGE `imageSrc` URL (the ELI5 cover image)
- Feed `imageSrc`: use Card 0's FULL_IMAGE `imageSrc` URL
- Cards 0-7 variant[0] `imageSrc` (FULL_IMAGE): a unique scene image URL matched to that section's theme (8 unique cover images total)
- Cards 0-7 variant[1+]: each CONTENT variant's `CONTENT_IMAGE` `imageSrc`: a DIFFERENT scene image from the card's FULL_IMAGE cover - never reuse the cover image in detail variants (Cards 2-3 use `CONTENT_SOCIAL` `avatarSrc` instead in detail variants)
- Cards 0-7 variant[1+]: each CONTENT variant's `backgroundSrc`: the selected BG image URL (same for all detail variants within a card, unique across cards)

Replace all image references with actual CDN URLs from the lookup table before writing the JSON. No placeholders should remain.

### Option B: Placeholders

Use picsum.photos URLs with deterministic seeds so they look consistent:

- Fork/feed `imageSrc`: `https://picsum.photos/seed/tfip-{owner}-{repo}/800/1200`
- FULL_IMAGE cover `imageSrc`: same picsum URL for all cards in a feed
- CONTENT detail `backgroundSrc`: use unique picsum URLs per card (e.g., append `-card0`, `-card1` to the seed)

In placeholder mode, all FULL_IMAGE `imageSrc` fields share the fork's picsum URL. Each card's `backgroundSrc` must still be unique.

### Option C: AI-generated images

If the user requested AI images:

1. **Generate image prompts file** `content/tfip-{owner}-{repo}-images.md`
2. **Style**: dark, code-themed aesthetic - not the ghost character from generate-book

**Image prompt template for /generate-push:**

```
Abstract illustration on deep dark background. Stylized geometric shapes, thick outlines, distorted perspective. Saturated neon colors leaning into {SCENE_COLORS}. Bold visible gradients across circuit-like patterns and data streams, not flat fills. Subtle digital grain noise. Strong contrast - large dark negative space against vivid neon areas. Cyberpunk UI and developer tool aesthetic. Subject: {SUBJECT_DESCRIPTION}. Avoid: photorealism, 3D rendering, glass morphism, bokeh, depth of field blur, muted palettes, watercolor, pencil sketch, stock photo aesthetic, thin linework, halftone dots, film grain, screen print texture, textureless smoothness, horror or sinister imagery.
```

**Scene colors per section:**
- Fork cover: electric blue and deep purple
- Explain like I'm 5: warm teal and soft cyan
- The roast: warning red and deep crimson
- Commit message, decoded: warm amber and burnt orange
- The LinkedIn post: corporate blue and LinkedIn teal
- Statistics: cool steel and midnight blue
- Learning moment: electric purple and magenta
- Alternatives: coral orange and sunset pink
- Quiz: warm amber and golden yellow

**Subject descriptions** should be abstract - flowing code symbols, geometric patterns, data streams - not literal depictions. Keep them short (2-3 sentences).

3. **Generate images** following the same `/generate-images` workflow (Google Flow, Nano Banana 2, Portrait, x1)
4. **Upload to CDN** and replace placeholders, same as `/generate-book` Phase 5

### Option D: Skip images

When images are skipped:
- Remove the FULL_IMAGE variant (variant[0]) from each card. Cards start directly with CONTENT detail variants.
- Omit `CONTENT_IMAGE` blocks from CONTENT variants.
- Still include `backgroundSrc` on CONTENT variants if background URLs are available, otherwise omit.
- The cards still work, they just won't have the visual cover or inline images.

### Finalize

1. **Write the JSON** to `manifests/tfip-{owner}-{repo}.json`
2. **Validate**:
   - All required fields present
   - All IDs match their regex patterns
   - Card `order` values are sequential within each feed
   - No placeholder text remaining (unless AI images were requested and will be replaced later)
   - `feedIds` in the fork match the actual feed `_id` values
3. **Report to user**:
   > "Generated content for {N} commit(s) from {owner}/{repo}"
   > "{N} feeds, {N} cards total"
   > "Upload with `/server-actions` (Sync only)"

---

## Incremental Updates (add-only)

**CRITICAL: never regenerate or modify existing commits. Never create duplicate feeds or cards.**

When `/generate-push` is run on a repo that already has content at `manifests/tfip-{owner}-{repo}.json`:

### Step 1 - Read and index existing content

```
Read the existing JSON file. Build two lookup sets:

existingFeedIds = set of all feed._id values in feeds[]
existingCardFeedIds = set of all card.feedId values in cards[]
```

### Step 2 - Extract already-processed SHAs

Each feed ID encodes the 7-char SHA as its last segment: `tfip-{owner}-{repo}-{sha}`.

```
For each feedId in existingFeedIds:
  processedSha = feedId.split('-').pop()   // last segment = 7-char SHA
  Add processedSha to processedSHAs set
```

### Step 3 - Filter requested commits

For each requested commit, take the first 7 chars of its full SHA and check:

```
If shortSha is in processedSHAs:
  Report: "Commit {shortSha} already processed, skipping"
  Remove from the list, do NOT generate anything for it
```

**Only commits NOT in processedSHAs proceed to content generation.**

If ALL requested commits are already processed, report "All commits already in the file, nothing to generate" and stop.

### Step 4 - Generate only new content

Generate feeds and cards ONLY for the filtered (new) commits. Follow the normal Phase 3 generation flow.

### Step 5 - Merge into existing JSON

```
Forks (forks[0] - the single fork in the array):
  - Keep title, description, imageSrc, actionLabel, actionUrl UNCHANGED
  - Prepend new feed IDs to the START of feedIds[] (newest first)
  - Do NOT duplicate any feedId that already exists in the array

Feeds:
  - Append new feed objects to feeds[]
  - Do NOT touch or overwrite any existing feed

Cards:
  - Append new card objects to cards[]
  - Do NOT touch or overwrite any existing card
  - VERIFY: no new card has a feedId matching an existing feed (this would mean a duplicate slipped through)
```

### Step 6 - Write back

Write the merged JSON. The upload script's idempotent upsert behavior (POST + PUT on 409) handles server-side merging automatically.

---

## Edge Cases

- **Merge commits**: skip by default (noise). Process only if explicitly requested or it's the only commit.
- **Empty commits** (no file changes): skip with a note to the user.
- **Binary files**: note "binary files changed" in Statistics, do not show diffs.
- **Very large diffs** (>4000 lines): summarize file list, pick top 5-10 files for code snippets.
- **First commit in repo** (no parent): use `git diff --root {sha}` or handle the GitHub API response accordingly.
- **Private repos**: `gh` CLI handles auth automatically if the user is logged in.
- **Monorepo commits**: group changed files by directory/package in the Statistics section.
- **Commit with only deletions**: focus Explain like I'm 5 on "what was removed and why", Learning moment on the cleanup approach.
- **Commit message is just "fix"**: use the diff content to generate a more descriptive feed title. Fall back to the short SHA + stats.

---

## Validation Rules

### Content block type safety (CRITICAL)

Before writing the final JSON, extract every unique `type` value from all `blocks` arrays across all cards. Then read the `ContentBlock.__resolveType` switch statement in `../forkfeed.app/app-server/src/graphql/resolvers/index.ts` and verify that **every block type in the manifest has a matching case**. If any block type is missing from the resolver, **stop and add the missing case to the resolver before proceeding**. This prevents the "Abstract type must resolve to an Object type at runtime" error that breaks the entire feed.

The allowed block types as of now are: `CONTENT_IMAGE`, `CONTENT_TEXT`, `CONTENT_TITLE`, `CONTENT_VIDEO`, `CONTENT_SOCIAL`, `CONTENT_SUBTEXT`, `CONTENT_CODE`, `CONTENT_QUIZ`, `CONTENT_BUTTON`. If you introduce a new block type, you MUST add it to the resolver first.

### Standard validation

These must pass before the JSON is considered ready:

- Fork/Feed `_id`: kebab-case, regex `/^[a-z0-9-]+$/`
- Card `_id`: UUID v4 format
- `feedId` on cards: must match an actual feed `_id`
- `order`: integer 0-7, sequential within each feed (8 cards per feed)
- `variants`: array with >= 2 items. variant[0] is always `FULL_IMAGE` with `imageSrc`, `title`, and `subtitle`. variant[1+] are always `CONTENT` with `backgroundSrc`.
- `FULL_IMAGE.imageSrc`: must be a valid URL
- `FULL_IMAGE.subtitle`: max 200 characters
- `CONTENT.blocks`: array with >= 1 block
- `CONTENT_TEXT.text`: min 1 char
- `CONTENT_TITLE.title`: min 1 char
- `CONTENT_CODE.code`: min 1 char
- `CONTENT_QUIZ.question`: min 1 char
- `CONTENT_QUIZ.options`: array with exactly 4 items, each with `label` (string) and `correct` (boolean), exactly one `correct: true`
- `CONTENT_QUIZ.explanation`: min 1 char (required)
- Feed `title`: 1-200 chars
- Feed `description`: 1-5000 chars
- Feed `mode`: always `"sequential"`
- Feed `scrollDirection`: always `"vertical"`
