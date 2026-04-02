# Formatter - Content Generation Rules

How to transform a commit diff into the 8-card multicard structure, assign images, and maintain the right tone.

---

## ID Conventions

| Entity | Pattern | Example |
|---|---|---|
| Fork | `tfip-{owner}-{repo}` | `tfip-vercel-next-js` |
| Fork (local) | `tfip-local-{dirname}` | `tfip-local-my-project` |
| Feed | `tfip-{owner}-{repo}-{7char-sha}` | `tfip-vercel-next-js-abc1234` |
| Card | UUID v4 | `d412037b-387e-4cc5-8708-ee54734c6a16` |

All IDs must match `/^[a-z0-9-]+$/`. Short SHA is always 7 lowercase hex chars.

Generate UUIDs upfront:
```bash
node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\n')"
```

---

## Card-Variant Architecture

Each feed has exactly **8 cards** (one per section). Users scroll DOWN between cards. Each card has multiple **variants**. Users swipe RIGHT between variants.

- **variant[0]**: Always `FULL_IMAGE` - the cover seen when scrolling down
- **variant[1+]**: Always `CONTENT` - detail variants revealed by swiping right

**Do NOT confuse cards with variants:**
- New section = new card (different `order`, different UUID)
- More detail within a section = more variants within the same card (same `_id`, same `order`)

---

## The 8 Sections

### Card 0: Explain like I'm 5 (order 0)

Dead simple explanations. No jargon.

- **Detail variants**: 3-6
- **Block pattern**: CONTENT_IMAGE (wide) -> CONTENT_TITLE -> CONTENT_TEXT
- **Guidelines**: Explain each major change as if teaching someone with zero technical background. Use absurd analogies. Break complex changes into bite-sized pieces.
- **Tone**: Friendly, accessible, playful. Like explaining to a smart non-developer friend while slightly tipsy.

### Card 1: The roast (order 1)

Standup comedy about your code.

- **Detail variants**: 3-6
- **Block pattern**: CONTENT_IMAGE (wide) -> CONTENT_TITLE -> CONTENT_TEXT, optional CONTENT_SUBTEXT for protips
- **Variant types to mix**:
  - Sarcastic observations referencing actual code from the diff
  - Fake ratings/comments (code review stars, fake Glassdoor reviews)
  - Bug radar: possible issues, missing tests, security concerns, wrapped in humor
- **Tone**: Maximum cheekiness. Swearing welcome. Funny, not mean-spirited.
- **Examples**: "82 lines for a Go Back button. Impressive commitment." / "No tests. Bold strategy, Cotton." / "17 files in one commit. You know git supports branches, right?"

### Card 2: Commit message, decoded (order 2)

Translate the commit message through escalating absurdity.

- **Detail variants**: 2-4
- **Block pattern**: CONTENT_SOCIAL -> CONTENT_TITLE -> CONTENT_TEXT -> optional CONTENT_CODE (original message)
- **Uses CONTENT_SOCIAL instead of CONTENT_IMAGE**. Each variant is a different "translator" persona:
  - What you meant: honest version. Source: `"x"` or `"threads"`
  - Corporate speak: corporate memo rewrite. Source: `"linkedin"`
  - Shakespearean (optional): dramatic rewrite. Source: `"x"`
  - Military briefing (optional): tactical report. Source: `"x"`
- **Persona names**: relatable dev name, "Director of Strategic Commits", "Sir Pushalot the Third", "Sgt. Merge Conflict"
- **Tone**: Escalating absurdity. Start grounded, end ridiculous.

### Card 3: The LinkedIn post (order 3)

Over-the-top LinkedIn posts about mundane code changes.

- **Detail variants**: 2-4
- **Block pattern**: CONTENT_SOCIAL -> CONTENT_TITLE -> CONTENT_TEXT -> CONTENT_SUBTEXT (fake engagement)
- **Uses CONTENT_SOCIAL instead of CONTENT_IMAGE**. Source is ALWAYS `"linkedin"`.
- **Fixed personas**:
  - Chad Gitpush: "10x Engineer | Building in Public | DMs Open"
  - Alexandra Middleware: "VP of Forward Thinking at TechCorp"
  - Dave 'Shipping' Johnson: "Just a humble engineer doing humble things"
  - Sarah Bootcamp (optional): "Former barista, current code warrior"
- **CONTENT_SUBTEXT**: fake reactions + comments ("47 reactions, 12 comments: 'This. So much this.'")
- **Tone**: Affectionate cringe, peak LinkedIn parody. MUST reference actual commit content.

### Card 4: Statistics (order 4)

By-the-numbers breakdown.

- **Detail variants**: 3-5
- **Block pattern**: CONTENT_IMAGE (wide) -> CONTENT_TITLE -> CONTENT_CODE (structured data)
- **Always include**: "By the numbers" (stats summary) and "Files touched" (grouped file list)
- **Use CONTENT_CODE for all structured data**, not CONTENT_TEXT
- **Tone**: Deadpan humor meets data. "17 files touched, which is either a refactor or a cry for help."

### Card 5: Learning moment (order 5)

Educational explainers on technologies and patterns.

- **Detail variants**: 3-8 (one per technology/pattern)
- **Block pattern**: CONTENT_IMAGE (wide) -> CONTENT_TITLE -> CONTENT_TEXT -> optional CONTENT_CODE -> **CONTENT_BUTTON (LAST)**
- **Every detail variant MUST end with CONTENT_BUTTON**:
  ```json
  { "type": "CONTENT_BUTTON", "label": "Google it", "action": "url", "target": "https://www.google.com/search?q=<url-encoded-topic>" }
  ```
  Spaces become `+` in the URL.
- **Structure per variant**: What it is -> Why it's used here -> When to use / not use -> Real-world analogy
- **Tone**: Teach with personality. "D1 is Cloudflare's serverless SQL database. Yes, another database. The world needed one more."

### Card 6: Alternatives (order 6)

Alternative approaches, feature ideas, what-ifs.

- **Detail variants**: 3-6
- **Block pattern**: CONTENT_IMAGE (wide) -> CONTENT_TITLE -> CONTENT_TEXT -> optional CONTENT_CODE
- **Synthesized/hypothetical code IS allowed** (only section where non-diff code is permitted)
- **Variant types**: alternative approaches, feature ideas, tradeoffs to consider
- **Tone**: Constructive with a wink. "Look, what you did works. But have you considered not doing that?"

### Card 7: Quiz (order 7)

Interactive quiz testing understanding of the commit.

- **Detail variants**: 10-15 (one question each)
- **Block pattern**: CONTENT_TITLE ("Question N") -> CONTENT_QUIZ. **No CONTENT_IMAGE.**
- **CONTENT_QUIZ structure**: `question`, `options` (array of 4, exactly one `correct: true`), `explanation` (required, should teach)
- **Difficulty mix**: 3-4 easy, 4-6 medium, 3-5 hard
- **Cover every significant change** in the commit
- **Tone**: Quiz show host energy. "What crime against clean code does line 47 commit?"

---

## Variant Count Summary

| Section | Cover | Detail | Total |
|---|---|---|---|
| Explain like I'm 5 | 1 | 3-6 | 4-7 |
| The roast | 1 | 3-6 | 4-7 |
| Commit message, decoded | 1 | 2-4 | 3-5 |
| The LinkedIn post | 1 | 2-4 | 3-5 |
| Statistics | 1 | 3-5 | 4-6 |
| Learning moment | 1 | 3-8 | 4-9 |
| Alternatives | 1 | 3-6 | 4-7 |
| Quiz | 1 | 10-15 | 11-16 |
| **Total** | **8** | **27-54** | **35-62** |

---

## Block Rules

- **CONTENT_TITLE**: required in every detail variant, sentence case ("Feature detection pattern" not "Feature Detection Pattern"). First block after image/social.
- **CONTENT_IMAGE**: `"sizing": "wide"` is default. Image must differ from the card's FULL_IMAGE cover. No two detail variants in the same card share a CONTENT_IMAGE.
- **CONTENT_TEXT**: 50-200 words per block. Short paragraphs. Use `\n\n` for breaks.
- **CONTENT_CODE**: real code from the diff, 5-20 lines, correct `language` param. Strip diff `+`/`-` prefixes. Only Card 6 (Alternatives) may use synthesized code.
- **CONTENT_SUBTEXT**: optional protips or asides.
- **CONTENT_SOCIAL**: only Cards 2-3. Replaces CONTENT_IMAGE. Fields: `avatarSrc`, `name`, `subtitle`, `source`.
- **CONTENT_QUIZ**: only Card 7. `question`, `options` (4 items, one `correct: true`), `explanation`.
- **CONTENT_BUTTON**: only Card 5. Must be LAST block. `"label": "Google it"`, `"action": "url"`.
- **No empty fields**: omit optional fields entirely.
- **ASCII only**: no em dashes (`--`), smart quotes, or non-ASCII characters.

---

## Code Snippet Rules

- Cards 0-5: all CONTENT_CODE must use REAL code from the actual diff, never fabricated
  - Cards 2-3 may include the original commit message in CONTENT_CODE
- Card 6 (Alternatives): synthesized code allowed
- Card 7 (Quiz): no code blocks
- Show the most interesting/relevant parts, not everything
- Strip `+` prefix from added lines
- Keep to 5-20 lines
- Always include the `language` parameter
- Use backticks in CONTENT_TEXT for file paths: `` `src/index.ts` ``

---

## Background Image Rules

Every card's CONTENT detail variants MUST have `backgroundSrc`:

- **One BG per card**: all detail variants within a card share the same `backgroundSrc`
- **Unique across cards**: each of the 8 cards uses a DIFFERENT background
- **8 unique BGs per feed**

---

## Image Handling

### CDN_DOMAIN resolution

URLs in `permanent_content/` use `{{CDN_DOMAIN}}` as placeholder. Read `CDN_DOMAIN` from `.dev.vars` and replace it. If not set, ask the user.

### Option A: IT Scenes (default)

Use images from `permanent_content/it-scenes-index.md` (IMAGE 1-200 and BG 1-30).

**Scene image matching** (for FULL_IMAGE covers and CONTENT_IMAGE):

By Phase 4, all card content is generated. Match using the full card content:

1. **Narrow** by tag overlap with commit tags (coarse filter)
2. **Rank** by semantic similarity to the actual variant content (title, text, code topics)
3. **Assign** best match, remove from pool

**Commit tags** (identify from the diff):
`deploy`, `git`, `disaster`, `debug`, `hype`, `victory`, `beginner`, `language`, `lifestyle`, `workplace`, `sarcastic`, `general`

**Uniqueness rules**:
- 8 unique cover images (one per card)
- Detail CONTENT_IMAGE MUST differ from the card's cover
- No two detail variants within the same card share a CONTENT_IMAGE
- Pick 16-25 unique images per feed (we have 200, use the variety)

**BG mapping per section**:

| Section | Primary BG | Fallback |
|---|---|---|
| ELI5 (0) | BG 10 (Night coding), BG 27 (Coffee) | BG 21 (Hackathon) |
| The roast (1) | BG 11 (Meme/irony), BG 1 (Error) | BG 20 (Legacy code) |
| Decoded (2) | BG 20 (Legacy code), BG 11 (Meme/irony) | BG 27 (Coffee) |
| LinkedIn (3) | BG 25 (Startup hustle), BG 24 (Imposter syndrome) | BG 21 (Hackathon) |
| Statistics (4) | BG 9 (Data), BG 3 (Infrastructure) | BG 16 (Data science) |
| Learning (5) | Match technology in the commit | BG 2 (Code/terminal) |
| Alternatives (6) | BG 25 (Startup hustle), BG 30 (Zen) | BG 22 (Open source) |
| Quiz (7) | BG 18 (QA testing), BG 5 (Debug) | BG 7 (Security) |

Language-specific BGs for Learning: BG 12 (JavaScript), BG 13 (Python), BG 14 (Rust).

If preferred BG is taken by another card, use fallback. Uniqueness > thematic match.

**Tag fallback preferences** (when content matching ties):
- ELI5: `beginner`, `general`, `lifestyle`
- Roast: `disaster`, `sarcastic`, `debug`
- Decoded: `sarcastic`, `lifestyle`, `workplace`
- LinkedIn: `workplace`, `hype`, `lifestyle`
- Statistics: `general` or technology-relevant
- Learning: match specific technologies
- Alternatives: `general`, `hype`
- Quiz: `debug`, `victory`

**Image assignment**:
- Fork/feed `imageSrc`: Card 0's FULL_IMAGE `imageSrc`
- Cards 2-3 detail: use `CONTENT_SOCIAL.avatarSrc` (scene image), not CONTENT_IMAGE

### Option B: Placeholders

Deterministic picsum.photos URLs:
- Fork/feed `imageSrc`: `https://picsum.photos/seed/tfip-{owner}-{repo}/800/1200`
- FULL_IMAGE covers: all share the fork's picsum URL
- BGs: unique per card (append `-card0`, `-card1` to seed)

### Option C: AI-generated

1. Write prompts to `content/tfip-{owner}-{repo}-images.md`
2. Style: dark, code-themed (not ghost character)
3. Prompt template:
   ```
   Abstract illustration on deep dark background. Stylized geometric shapes, thick outlines, distorted perspective. Saturated neon colors leaning into {SCENE_COLORS}. Bold visible gradients across circuit-like patterns and data streams, not flat fills. Subtle digital grain noise. Strong contrast - large dark negative space against vivid neon areas. Cyberpunk UI and developer tool aesthetic. Subject: {SUBJECT_DESCRIPTION}. Avoid: photorealism, 3D rendering, glass morphism, bokeh, depth of field blur, muted palettes, watercolor, pencil sketch, stock photo aesthetic, thin linework, halftone dots, film grain, screen print texture, textureless smoothness, horror or sinister imagery.
   ```
4. Scene colors: ELI5=warm teal/soft cyan, Roast=warning red/deep crimson, Decoded=warm amber/burnt orange, LinkedIn=corporate blue/LinkedIn teal, Stats=cool steel/midnight blue, Learning=electric purple/magenta, Alternatives=coral orange/sunset pink, Quiz=warm amber/golden yellow

### Option D: Skip images

- Remove FULL_IMAGE variant (variant[0]) from each card
- Omit CONTENT_IMAGE blocks from CONTENT variants
- Still include `backgroundSrc` if available

---

## Tone & Voice

The writing should feel like your funniest, smartest friend reviewing your code.

### Global rules

- Casual, cheeky, technically accurate
- Use "you" directly: "you added...", "your code does..."
- Short paragraphs, no walls of text
- Contractions: "it's", "you're", "doesn't"
- Swear occasionally for emphasis when it fits naturally
- Humor is the default, not the exception

### Cheekiness scale

| Section | Level | Notes |
|---|---|---|
| ELI5 | Medium | Playful analogies, slightly absurd comparisons |
| The roast | Maximum | Full standup comedy, swearing welcome |
| Decoded | Maximum | Escalating absurdity, commitment to the bit |
| LinkedIn | Maximum | Affectionate cringe, peak LinkedIn parody |
| Statistics | Medium | Dry wit, deadpan observations |
| Learning | Medium | Teach with personality, not textbook energy |
| Alternatives | Medium | Suggestions with a bit of snark |
| Quiz | Medium-high | Questions should be entertaining to read |

### Good examples

- "So you slapped a WebSocket server onto this thing. Bold move. Let's see what that actually does."
- "22 files in one commit. Someone's feeling confident today."
- "This is a classic middleware chain - each function hands off to the next, like a bucket brigade where half the buckets are on fire."
- "No tests for the new route. Living dangerously, we respect it."
- "42 lines added, 3 deleted. The codebase just gained weight."

### Bad examples (too formal)

- "The developer has implemented a WebSocket server utilizing the ws library."
- "It is recommended to consider Server-Sent Events as an alternative."
- "This commit modifies 22 files across the repository."

---

## Large Commit Handling (>4000 lines)

- Summarize the full file list with stats
- Focus code snippets on the 5-10 most interesting/impactful files
- Group related file changes by area
- Never dump the entire diff into cards
- Note the full scope in ELI5 but keep other sections focused

---

## Diff Analysis

For each commit, analyze the raw diff and produce a structured breakdown for the 8 cards:

1. **ELI5**: dead simple explanations of what was done
2. **Roast**: sarcastic, funny take. Ironic observations, fake ratings, "bug radar"
3. **Decoded**: translate commit message through escalating absurdity
4. **LinkedIn**: absurd LinkedIn posts from different personas
5. **Statistics**: files changed, lines, languages, grouped changes
6. **Learning**: technologies, libraries, patterns that appear
7. **Alternatives**: other approaches, feature ideas, considerations
8. **Quiz**: 10-15 questions testing understanding of the commit
