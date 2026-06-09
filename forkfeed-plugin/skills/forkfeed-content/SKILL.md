---
name: forkfeed-content
description: Generate swipeable forkfeed "The Fuck I Pushed" content from a git commit - exactly 6 cards (Explain Like I'm 5, Roast, LinkedIn, Learning, Alternatives, Quiz) as simplified JSON for the forkfeed publish script. Use when the user wants to turn a git commit or diff into forkfeed content, or runs the /forkfeed command.
---

# Forkfeed Content Guide - "The Fuck I Pushed"

Turn a single git commit into a swipeable card feed. One fork per repo, one feed
per commit, exactly 6 cards per feed. Process exactly ONE commit at a time.

## Flow

1. List commits: `node "${CLAUDE_PLUGIN_ROOT}/scripts/forkfeed.mjs" commits`
2. Ask which ONE commit to process.
3. Read the repo's root context docs (README.md and any CONTRIBUTING / ARCHITECTURE / docs guides at the repo root) so the content reflects what the project actually IS, not just the diff.
4. Get the diff + suggested scene images: `... suggest --sha <sha>`
5. Generate the simplified content JSON (format below) and write it to a temp file.
6. Publish: `... publish --file <tmp.json>` (add `--dry-run` first to preview).
   No token, no login: content publishes anonymously and unlisted (viewable by
   anyone with the link, not shown in discovery). Then in your reply give the user
   the `Open it: <url>` line AND reproduce the FULL QR code from the script output
   verbatim inside a fenced code block (```), copied character-for-character. Never
   summarize, redraw, or omit the QR - it must render as text so the user can scan
   it on screen. The QR opens the feed directly in the forkfeed app.

## Simplified content format

You only provide creative content. The publish script auto-detects repo info
(owner, repo, GitHub url), assigns card backgrounds, resolves short image ids to
CDN urls, adds the cover variant per card, derives the fork/feed slugs, and
generates card ids.

```json
{
  "sha": "7char-sha",
  "feedTitle": "Max 60 chars headline",
  "feedDescription": "Mon DD: one-line impact summary",
  "forkTitle": "Project Name",
  "forkDescription": "What the project IS",
  "cards": [
    {
      "variants": [
        { "blocks": [{ "img": "img47" }, { "title": "Section heading" }, { "text": "Paragraph..." }] },
        { "blocks": [{ "title": "Another section" }, { "text": "More content..." }] }
      ]
    }
  ]
}
```

Only 5 fields + `cards` (exactly 6). Everything else is auto-populated.

### Block types (inferred from fields)

| Write this | Becomes | Notes |
|------------|---------|-------|
| `{ "img": "img47" }` | CONTENT_IMAGE | sizing defaults to "wide". Options: automatic, wide, portrait, square, small_portrait |
| `{ "img": "img47", "sizing": "square" }` | CONTENT_IMAGE | With explicit sizing |
| `{ "title": "Heading" }` | CONTENT_TITLE | Sentence case |
| `{ "text": "Paragraph..." }` | CONTENT_TEXT | 50-200 words, use \n\n for breaks |
| `{ "code": "const x = 1", "lang": "typescript" }` | CONTENT_CODE | Real code from the diff, 5-20 lines, strip +/- prefixes |
| `{ "subtext": "Pro tip..." }` | CONTENT_SUBTEXT | Aside or protip |
| `{ "name": "Chad", "subtitle": "10x Engineer", "avatar": "img98", "source": "linkedin" }` | CONTENT_SOCIAL | Card 2 only. avatar can be an image id or url. source: x, linkedin, threads, etc. |
| `{ "question": "What does X do?", "options": [{"label":"A","correct":false},{"label":"B","correct":true}], "explanation": "Because..." }` | CONTENT_QUIZ | Card 5 only. 4 options recommended, min 2, exactly one correct, always include explanation |
| `{ "label": "Google it", "action": "url", "target": "https://google.com/search?q=topic" }` | CONTENT_BUTTON | Card 3 only, MUST be the last block in every detail variant |

### What the publish script does automatically

- Detects repo owner/name from the git remote and builds the GitHub action url
- Derives the fork slug (`tfip-{owner}-{repo}`) and feed slug (`...-{sha7}`)
- Assigns 6 unique card backgrounds from a preference table + commit tags
- Resolves short image ids (img47, bg10) to CDN urls
- Adds a FULL_IMAGE cover variant with a fixed title/subtitle per card
- Sets the background on each detail variant
- Validates the content, then POSTs it to the forkfeed app (stored private)

## The 6 cards

Each card is an array of detail variants (the cover is auto-added). Provide 1+
variants per card. Quality over quantity.

| # | Section | Detail variants | Block pattern | Tone |
|---|---------|----------------|---------------|------|
| 0 | Explain like I'm 5 | 2-3 | img -> title -> text | Playful, zero jargon |
| 1 | The roast | 2-3 | img -> title -> text, optional subtext | Maximum cheekiness, swearing ok |
| 2 | The LinkedIn post | 2-3 | social -> title -> text | Peak LinkedIn parody |
| 3 | Learning moment | 2-3 | img -> title -> text -> optional code -> button(last) | Teach with personality |
| 4 | Alternatives | 2-3 | img -> title -> text -> optional code | Constructive snark |
| 5 | Quiz | 4-6 | quiz only (no img or title blocks) | Quiz show energy |

### Card 2 personas (LinkedIn)
- Chad Gitpush: "10x Engineer | Building in Public | DMs Open"
- Alexandra Middleware: "VP of Forward Thinking at TechCorp"
- Dave 'Shipping' Johnson: "Just a humble engineer doing humble things"

## Key rules

- Exactly 6 cards in the cards array (one per section above)
- Use short image ids from the suggest output (img47, not full urls)
- 8-12 unique scene images (img*) across the feed, no duplicate within the same card
- Cards 0-3: code must be REAL from the diff (never fabricated)
- Card 4: synthesized code IS allowed
- Card 5: no img blocks, quiz blocks only (the question serves as the heading)
- Card 3: every detail variant MUST end with a button block
- Card 2: first block should be social (not img), no engagement-metric subtext
- CONTENT_QUIZ: 4 options recommended (min 2), exactly one correct, always include explanation
- No em dashes, smart quotes, or non-ASCII characters
- Feed title max 60 chars

### Tone
Casual, cheeky, technically accurate. Use "you," contractions, short paragraphs,
occasional swearing. Humor is the default.

### One publish, one link
Each publish creates a fresh unlisted fork with its own shareable link (and QR).
Re-running for the same commit just makes a new link. Process exactly ONE commit
at a time, never multiple.

## Content policy

All content must comply with the forkfeed Terms of Service and Privacy Policy.
No illegal, harmful, harassing, defamatory, obscene, or otherwise objectionable
material; no nudity, sexually explicit content, graphic violence, or hate speech.
This applies to text, image prompts, quiz questions, code, and metadata.
