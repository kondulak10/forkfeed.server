/**
 * Condensed skill guide for generating forkfeed content from GitHub commits.
 * Returned by the forkfeed_guide tool. This is the single-read reference
 * that teaches Claude how to generate valid card content.
 */
export const GUIDE_CONTENT = `
# Forkfeed Content Guide - "The Fuck I Pushed"

Turn GitHub commits into swipeable card content. One fork per repo, one feed per commit, 6 cards per feed.

**Process exactly ONE commit at a time, never multiple.**

## Quick start

1. Call **forkfeed_guide** and **forkfeed_commits()** in parallel
2. Show commits table, ask which ONE to process
3. Call **forkfeed_commits(sha)** to get diff, stats, and suggested scene images
4. Generate simplified content JSON (see format below)
5. Call **forkfeed_build** with the content - it writes typed .ts files into the forkserver repo's forks/ folder
6. In the forkserver repo run \`npm run convert && npm run typecheck && npm run deploy\`, then call **forkfeed_publish** with your deployed forkServerUrl

---

## Simplified content format (for forkfeed_build)

The builder auto-detects repo info (owner, repo, GitHub URL) and auto-assigns card backgrounds, then writes the typed feed file into the forkserver repo. You only provide creative content.

\`\`\`json
{
  "sha": "7char-sha",
  "feedTitle": "Max 60 chars headline",
  "feedDescription": "Mon DD: one-line impact summary",
  "forkTitle": "Project Name",
  "forkDescription": "What the project IS",
  "cards": [
    {
      "variants": [
        { "blocks": [{ "img": "img47" }, { "title": "Section heading" }, { "text": "Paragraph content..." }] },
        { "blocks": [{ "title": "Another section" }, { "text": "More content..." }] }
      ]
    }
  ]
}
\`\`\`

Only 5 fields + cards. Everything else is auto-populated.

### Block types (inferred from fields)

| Write this | Becomes | Notes |
|------------|---------|-------|
| \`{ "img": "img47" }\` | CONTENT_IMAGE | sizing defaults to "wide". Options: automatic, wide, portrait, square, small_portrait |
| \`{ "img": "img47", "sizing": "square" }\` | CONTENT_IMAGE | With explicit sizing |
| \`{ "title": "Heading" }\` | CONTENT_TITLE | Cards 0-4 detail variants, sentence case |
| \`{ "text": "Paragraph..." }\` | CONTENT_TEXT | 50-200 words, use \\\\n\\\\n for breaks |
| \`{ "code": "const x = 1", "lang": "typescript" }\` | CONTENT_CODE | Real code from diff, 5-20 lines, strip +/- prefixes |
| \`{ "subtext": "Pro tip..." }\` | CONTENT_SUBTEXT | Aside or protip |
| \`{ "name": "Chad", "subtitle": "10x Engineer", "avatar": "img98", "source": "linkedin" }\` | CONTENT_SOCIAL | Card 2 only. avatar can be image ID or URL. source: x, linkedin, threads, etc. |
| \`{ "question": "What does X do?", "options": [{"label": "A", "correct": false}, {"label": "B", "correct": true}], "explanation": "Because..." }\` | CONTENT_QUIZ | Card 5 only. 4 options recommended, min 2, one correct, always include explanation |
| \`{ "label": "Google it", "action": "url", "target": "https://google.com/search?q=topic" }\` | CONTENT_BUTTON | Card 3 only, MUST be last block in every detail variant |

### What the builder does automatically
- Detects repo owner/name from git remote
- Generates fork/feed IDs from convention (tfip-{owner}-{repo}-{sha})
- Constructs GitHub action URL
- Assigns 6 unique card backgrounds from preference table + commit tags
- Generates a stable id for each card
- Resolves short image IDs (img47, bg10) to full CDN URLs
- Adds FULL_IMAGE cover variant with fixed title/subtitle per card type
- Sets backgroundSrc on each detail variant
- Validates the content, then writes typed StaticFeed files into forks/<forkId>/ and regenerates fork.ts

### Optional overrides
- \`bgOverride\`: array of 6 background IDs to override auto-assignment
- \`coverOverride\`: array of 6 cover image IDs (defaults to backgrounds)
- \`cwd\`: working directory for git if not process.cwd()
- \`outDir\`: forkserver repo root to write into (defaults to cwd)

---

## The 6 cards

Each card = array of detail variants (cover is auto-generated). Provide 1+ variants per card. Quality over quantity: pick only the most impactful, funny, or educational content.

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

---

## Key rules

- Exactly 6 cards in the cards array (one per section above)
- Use short image IDs from forkfeed_commits output (img47, not full URLs)
- 8-12 unique scene images (img*) across the feed, no duplicate within same card
- Cards 0-3: code must be REAL from the diff (never fabricated)
- Card 4: synthesized code IS allowed
- Card 5: no img blocks, quiz blocks only (question serves as heading)
- Card 3: every detail variant MUST end with a button block
- Card 2: first block should be social (not img), no engagement metrics subtext (reactions, comments, reposts)
- CONTENT_QUIZ: 4 options recommended (min 2), exactly one correct, always include explanation
- No em dashes, smart quotes, or non-ASCII characters
- Feed title max 60 chars

### Tone
Casual, cheeky, technically accurate. Use "you," contractions, short paragraphs, occasional swearing. Humor is the default.

### Incremental updates
Each commit becomes one feed file named from its SHA (fork-sha7.ts), so a fork
accumulates one feed per processed commit. Re-building the same commit overwrites that
same feed file; building a new commit adds a new feed file and regenerates fork.ts to
import them all.

- **New commit**: Just generate content; the new feed is added to the fork.
- **Existing commit**: Warn the user - rebuilding overwrites that commit's feed file.
- **One commit per run**: Never process multiple commits at once.
`.trim();
