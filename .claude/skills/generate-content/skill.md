---
name: generate-content
description: Generate forkfeed server content for a topic with AI-generated images
user_invocable: true
---

# /generate-content

Generate rich forkfeed server content for a given topic and save it as a JSON file. The skill guides the user through a questionnaire to gather all requirements before generating.

## How to use

The user says `/generate-content`. Do **not** expect any arguments - the questionnaire below gathers everything.

If the user does pass a topic (e.g., `/generate-content Lord of the Rings`), use it as the answer to Question 1 and skip straight to Question 2.

The skill runs in three mandatory phases: **(1) Questionnaire -> (2) Web Research -> (3) Content Generation**. The research phase cannot be skipped - all factual content must be sourced from live web research, never from training data alone.

---

## Questionnaire Flow

Ask the following questions **one at a time** using `AskUserQuestion`. Each question builds on previous answers. Wait for the user's response before proceeding to the next question.

### Question 1 - Topic

Ask: **"What do you want to create content about?"**

No predefined options - this is free text. Prompt with examples:
- A book or movie (e.g., "Lord of the Rings", "Interstellar")
- A subject (e.g., "Python programming", "Mediterranean cooking")
- A concept (e.g., "Stoic philosophy", "History of jazz")

### Question 2 - Content Type

Ask: **"What kind of content is this?"**

Options:
- **Book / story** - Adapting a book, movie, series, or narrative into visual cards
- **Educational** - Teaching a skill or concept with structured lessons
- **Collection** - Curating items, examples, or resources around a theme
- **Guide** - Informational walkthrough or reference material

### Question 3 - Structure

Ask: **"How should the feeds be organized?"**

Options depend on the content type from Q2:

**Book / story:**
- By chapters or acts
- By characters
- By themes or motifs
- By timeline / chronology

**Educational:**
- By topic area
- By difficulty (beginner -> advanced)
- By learning path (sequential lessons)

**Collection:**
- By category
- By ranking / top picks
- By source or origin

**Guide:**
- By step / phase
- By sub-topic
- By use case

Always include a "Custom" option for the user to describe their own structure.

### Question 4 - Scale

Ask: **"How big should this be?"**

Options:
- **Compact** - 3-5 feeds, 3-4 cards each (~15 cards total). Quick overview.
- **Standard** - 6-10 feeds, 4-6 cards each (~40 cards total). Good depth without overload.
- **Deep dive** - 10-15 feeds, 5-8 cards each (~80 cards total). Comprehensive coverage.

### Question 5 - Tone & Voice

Ask: **"What writing style should the cards use?"**

Options:
- **Storytelling** - Vivid, narrative, emotionally engaging. Reads like a story.
- **Educational** - Clear, structured, builds understanding step by step.
- **Casual** - Conversational, fun, light. Like explaining to a friend.
- **Encyclopedic** - Detailed, factual, thorough. Reference-quality depth.

### Question 6 - Quizzes

Ask: **"Should the content include interactive quiz questions?"**

Options:
- **No quizzes** - Pure content, no interactive elements.
- **End of each feed** - A quiz card at the end of each feed to test what the user just read.
- **Sprinkled throughout** - 1-2 quiz cards per feed mixed in between content cards for engagement.
- **Dedicated quiz feed** - A separate feed that's all quiz cards reviewing the full topic.

### Question 7 - Summary & Final Check

Present a formatted summary of all collected answers:

```
Topic:     {answer 1}
Type:      {answer 2}
Structure: {answer 3}
Scale:     {answer 4}
Tone:      {answer 5}
Quizzes:   {answer 6}
```

Ask: **"Here's what I'll generate. Anything you'd like to add or change?"**

Options:
- **Looks good, start researching** - Proceed to the mandatory research phase.
- **Change something** - Let me adjust one of the answers above.
- **Add specific instructions** - E.g., "focus on the villains", "include code examples", "keep feeds short".

If the user picks "Change something", ask which question to revisit and re-ask just that question. If they add instructions, note them and proceed.

---

## Mandatory Research Phase

This phase runs AFTER the questionnaire and BEFORE content generation. It is **never optional**, regardless of the topic. All factual content in the generated cards must be sourced from live web research - training data may only supplement writing style, narrative structure, and transitions.

### Why Research is Mandatory

- Training data may contain outdated facts, defunct URLs, closed businesses, incorrect statistics, or discontinued tools
- Even "well-known" topics (popular books, major technologies) have evolving details - new editions, updated APIs, changed company structures, revised statistics
- The user expects current, accurate, verifiable content - not a rephrasing of potentially stale training data
- This phase runs for EVERY topic, EVERY time, no exceptions - even if the topic seems familiar

### Research Rules

- **Never open a browser** - all research is done via background agents using `WebSearch` and `WebFetch` tools. Do not use any browser automation or MCP chrome tools for research.
- **Always use background agents** - research agents run in the background (`run_in_background: true`) so the user is not blocked. Never perform research in the main conversation thread.
- **No training data as primary source** - training data may only supplement writing style and framing, never factual claims.

### Step 1 - Design Research Plan

After Question 7 confirmation, analyze the questionnaire answers and produce a research plan:

1. Take the topic (Q1), content type (Q2), structure (Q3), and any additional instructions from Q7
2. Identify **4-6 research angles** that cover the topic comprehensively. Each angle should map roughly to one or more planned feeds so that every feed has dedicated research backing it
3. Present the research plan to the user:
   > "Before generating content, I'll research this topic thoroughly. Here's my research plan:"
   > *(list the research angles with 1-line descriptions)*
   > "Launching research agents now..."

Do NOT wait for user approval of the research plan - proceed immediately. The user already approved the overall plan in Question 7.

### Step 2 - Launch Parallel Research Agents

Launch **4-6 background agents** (`run_in_background: true`), each assigned to one research angle. Running them in parallel means the total research time equals the slowest single agent, not the sum of all agents.

**Each research agent receives a prompt structured like this:**

```
Research the following aspect of "{topic}": {specific research angle}

Use WebSearch to find current, authoritative sources. For each promising search result,
use WebFetch to read the full page content. Do NOT rely on search snippets alone.

Research guidelines:
1. Perform at least 3-5 different WebSearch queries, refining search terms based on
   initial results. Try different phrasings, related terms, and specific sub-topics.
2. Use WebFetch on at least 3-4 of the most relevant results to get detailed information
3. Prioritize: official sources, recent articles (2024-2026), authoritative references
4. For statistics/numbers: find the most recent available data and note the source + date
5. For organizations/companies: verify they still exist and check for recent developments
6. For URLs/tools: verify the URL is current and the tool/service is still active
7. For technical content: verify against official documentation
8. Collect relevant image URLs you encounter - high-quality photos, official product images,
   or Unsplash images that could illustrate the topic. Note what each image depicts.

Output format - return a structured research brief:

## Research: {angle name}

### Key Facts (verified)
- Fact 1 [Source: URL or site name]
- Fact 2 [Source: URL or site name]
...

### Statistics & Numbers
- Stat with year/source
...

### Notable Details (interesting for card content)
- Detail that would make engaging card text
...

### Potential Inaccuracies to Avoid
- Common misconception or outdated info discovered during research
...

### Image URLs Found
- [Description of image] URL
...

### Sources Used
- [Title](URL) - what was found here
...
```

### Research Agent Templates by Content Type

Use these templates to determine what each agent should research, based on the content type selected in Q2:

**Book / Story:**
- Agent 1: **Plot & Structure** - Chapter summaries, act structure, key plot points, narrative arc
- Agent 2: **Characters** - Main and supporting characters, relationships, character arcs, motivations
- Agent 3: **Themes & Analysis** - Literary themes, symbolism, critical reception, scholarly interpretations
- Agent 4: **Author & Context** - Author biography, writing process, historical context, publication history
- Agent 5: **Reception & Legacy** - Awards, adaptations, fan community, cultural impact, sales figures

**Educational:**
- Agent 1: **Core Concepts** - Foundational definitions, current best practices, canonical explanations
- Agent 2: **Current State** - Latest developments, version updates, new approaches, recent changes
- Agent 3: **Practical Applications** - Real-world examples, case studies, industry usage, common patterns
- Agent 4: **Common Pitfalls** - Frequent mistakes, misconceptions, anti-patterns, debugging guides
- Agent 5: **Learning Resources** - Best tutorials, recommended paths, tools, community consensus

**Collection:**
- Agent 1: **Items Overview** - Comprehensive list, rankings, categorizations
- Agent 2: **Item Details (Batch A)** - Deep dive on first half of items
- Agent 3: **Item Details (Batch B)** - Deep dive on second half of items
- Agent 4: **Comparisons & Context** - How items relate, trends, history of the category

**Guide:**
- Agent 1: **Core Process** - Main steps, procedures, workflows being guided
- Agent 2: **Current Information** - Prices, requirements, regulations, tools (time-sensitive data)
- Agent 3: **Expert Tips** - Advanced advice, shortcuts, insider knowledge
- Agent 4: **Troubleshooting** - Common problems, edge cases, what can go wrong

These are starting templates - adapt them based on the specific topic and the user's additional instructions from Q7. For topics that don't fit neatly into one type, mix and match angles from multiple templates.

### Step 3 - Synthesize Research

After all research agents complete:

1. **Collect all agent outputs** and compile them into a single internal Research Brief
2. **Resolve conflicts** - if two agents found contradictory facts, use the more authoritative or more recent source
3. **Identify gaps** - if a planned feed has insufficient research backing, run 1-2 additional targeted `WebSearch` + `WebFetch` calls in the main conversation to fill the gap
4. **Collect image URLs** - gather all image URLs from research agents into a single list. These will be used for feed covers, FULL_IMAGE cards, and CONTENT_IMAGE blocks.
5. **Show a Research Summary** to the user (5-10 lines):
   > "Research complete. Consulted {N} sources across {M} research angles."
   > "Key findings: {2-3 most interesting or surprising discoveries}"
   > "Proceeding to content generation..."

The full Research Brief (all agent outputs combined) stays in context and serves as the **primary source material** for all subsequent content generation.

### Research Quality Gate

Before proceeding to content generation, verify:

1. **Minimum source count**: At least **10 unique web sources** were consulted across all agents (via WebFetch, not just search snippets)
2. **Feed coverage**: Every planned feed has at least **2-3 verified facts** from research backing it
3. **Recency**: For time-sensitive topics (tech, job markets, current events, tools), at least some sources are from the current or previous year
4. **No orphan feeds**: If a feed has zero research backing, either run additional research or remove/merge the feed

If the quality gate fails, run additional targeted research before proceeding. Do not skip ahead to content generation with insufficient research.

### How Research Flows into Content Generation

These rules govern how research must be used when writing card content:

1. **Every `CONTENT_TEXT` block** must be based on facts found during research. Never write factual claims purely from training data.
2. **Statistics and numbers** must come from research with identifiable sources. If research did not surface a specific number, do not invent one - omit it or describe qualitatively instead.
3. **Names of organizations, people, tools, and URLs** must be verified through research. Do not include entities that were not confirmed to exist in research results.
4. **Quiz questions** (`CONTENT_QUIZ`) must test facts that were verified during research. Incorrect options should be plausible but verifiably wrong.
5. **Training data as supplement only**: Training data may be used for writing style, narrative structure, transitions, and general framing - but never as the source of factual claims.
6. **When in doubt, omit**: If a fact could not be verified through research, leave it out rather than risk inaccuracy. A card with fewer but accurate facts is better than one with more but unreliable facts.

---

## Content Generation

### Pre-generation Setup

Before generating content, do two things:

**1. Get UUID pool for card IDs:**

```bash
node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\n')"
```

Replace `N` with the planned total card count. Assign one UUID per card.

**2. Read background catalog:**

Read `permanent_content/backgrounds.md` to get the list of available background images. Each background has a title, tags, mood description, and CDN URL. You will assign one background per feed, matching the background's mood to the feed's theme.

**CDN_DOMAIN resolution:** URLs in `permanent_content/` files use `{{CDN_DOMAIN}}` as a placeholder. Read `CDN_DOMAIN` from `.dev.vars` and replace `{{CDN_DOMAIN}}` with its value when constructing image URLs. If `CDN_DOMAIN` is not set, ask the user for their CDN domain before proceeding.

### Behavior Based on Answers

**Important:** All content generation below assumes the Research Phase has completed and a Research Brief is available in context. Use the Research Brief as the primary source for all factual content.

#### Quiz adjustments

- **No quizzes** - Skip quiz blocks entirely.
- **End of each feed** - Add one quiz card as the last card in each feed. The quiz CONTENT variant should pair `CONTENT_TITLE` ("Quick Quiz") + `CONTENT_QUIZ` block. Questions should test key facts from that feed.
- **Sprinkled throughout** - Place 1-2 `CONTENT_QUIZ` blocks within regular CONTENT cards after a key fact is explained (reinforcement). Can be a standalone block in a CONTENT variant alongside title+text.
- **Dedicated quiz feed** - Create an additional feed with quiz-only cards. See the "Quiz Feed" section below for the full multi-variant structure.

#### Content type adjustments

- **Book / story** - Prioritize narrative flow, character moments, key scenes. Use more FULL_IMAGE variants for dramatic moments. Multi-variant cards for "scene + context" pairs.
- **Educational** - Prioritize clarity and progression. Use more CONTENT variants with structured text. Include CONTENT_CODE blocks for technical topics. Sequential feed ordering.
- **Collection** - Each card can be more self-contained. Consistent card structure across the feed. Good for multi-variant "overview + detail" patterns.
- **Guide** - Step-by-step structure. Clear CONTENT_TITLE headings. Use CONTENT_SUBTEXT for tips and warnings.

---

## Image Sourcing

All images come from the web - there is no image generation step.

### Feed/Fork Covers, FULL_IMAGE Cards, and CONTENT_IMAGE Blocks

Use images found during web research or Unsplash. Priority order:

1. **Research images** - official product photos, book covers, screenshots, or high-quality images found during the research phase. Preferred when available because they're topic-specific.
2. **Unsplash** - search for relevant free photos. Use direct Unsplash image URLs found via WebSearch (e.g., search "unsplash {topic keywords}"). Pick terms relevant to each card's content.

All `imageSrc` fields must be valid URLs. If no suitable image is found for a card, use the feed's cover image as fallback.

**Feed cover images** are reused as the first FULL_IMAGE card's `imageSrc` in each feed (they share the same image).

### CONTENT Card Backgrounds (`backgroundSrc`)

Every CONTENT variant gets a `backgroundSrc` from the pre-made background catalog at `permanent_content/backgrounds.md`.

Rules:
- **One background per feed** - all CONTENT variants within a feed share the same `backgroundSrc`
- **Unique across feeds** - each feed uses a different background. No two feeds share a BG.
- **Match by mood** - read the background's title, tags, and mood description. Pick the one that best fits the feed's theme and emotional tone.
- **Quiz feed backgrounds** - when using a dedicated quiz feed, quiz card CONTENT variants use the `backgroundSrc` that matches the chapter/feed they cover (not a single BG for the whole quiz feed).

---

## Output

Write a JSON file to `manifests/<topic-slug>.json`. This is an **intermediate**: the
final content lives as typed TypeScript files under `forks/`, but writing the manifest
first lets you author all cards/feeds in one place and then convert it. Use this exact
structure:

```json
{
  "forks": [
    {
      "_id": "topic-slug",
      "title": "Topic Title",
      "description": "A compelling 1-2 sentence description of the fork.",
      "imageSrc": "<image URL>",
      "feedIds": ["topic-slug-feed-1", "topic-slug-feed-2"]
    }
  ],
  "feeds": [
    {
      "_id": "topic-slug-feed-name",
      "title": "Feed Title",
      "description": "One or two sentences describing this feed.",
      "imageSrc": "<image URL>",
      "mode": "sequential",
      "scrollDirection": "vertical",
      "engagement": true
    }
  ],
  "cards": [
    {
      "_id": "uuid-v4-here",
      "feedId": "topic-slug-feed-name",
      "order": 0,
      "variants": [...]
    }
  ]
}
```

The `forks` array defines how feeds are grouped into browsable forks in the app. Each content file should have exactly one fork that references all its feeds. The fork's `feedIds` array must list every feed `_id` in the file.

## ID Format

- **Fork IDs**: kebab-case slug (e.g., `lotr`, `trondheim-jobs`). Regex: `/^[a-z0-9-]+$/`
- **Feed IDs**: `<prefix><feed-slug>` kebab-case (e.g., `lotr-fellowship`, `tj-overview`). Regex: `/^[a-z0-9-]+$/`
- **Card IDs**: UUID v4 format. Before generating cards, run this to get a pool of real UUIDs:
  ```bash
  node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\n')"
  ```
  Replace `N` with the planned number of cards. Assign one UUID to each card's `_id` field. This is required for the app's like/reaction system.

---

## Card Variant Types

Each card has a `variants` array with one or more variants. Users swipe horizontally between variants.

### FULL_IMAGE

Basic (full-bleed image):
```json
{
  "type": "FULL_IMAGE",
  "imageSrc": "<image URL>",
  "title": "Optional title overlay",
  "subtitle": "Optional subtitle"
}
```

Two-layer (background + foreground PNG). When multiple variants share the same `backgroundSrc`, the background stays static while foreground images swipe:
```json
{
  "type": "FULL_IMAGE",
  "imageSrc": "<foreground PNG with transparency>",
  "backgroundSrc": "<full-bleed background image>",
  "title": "Optional title overlay",
  "subtitle": "Optional subtitle"
}
```

### FULL_VIDEO
```json
{
  "type": "FULL_VIDEO",
  "videoSrc": "https://example.com/video.mp4",
  "posterSrc": "<image URL>",
  "title": "Optional title"
}
```

### CONTENT
```json
{
  "type": "CONTENT",
  "backgroundSrc": "<background CDN URL from permanent_content/backgrounds.md>",
  "blocks": [
    { "type": "CONTENT_IMAGE", "imageSrc": "<image URL>", "alt": "Description", "sizing": "wide" },
    { "type": "CONTENT_TITLE", "title": "Title", "subtitle": "Optional subtitle" },
    { "type": "CONTENT_TEXT", "text": "Paragraph text. Can be long. Use \\n\\n for paragraph breaks." },
    { "type": "CONTENT_VIDEO", "videoSrc": "https://...", "posterSrc": "https://..." },
    { "type": "CONTENT_SOCIAL", "avatarSrc": "https://...", "name": "Name", "subtitle": "Optional", "source": "x" },
    { "type": "CONTENT_SUBTEXT", "text": "A smaller, greyed caption or note." },
    { "type": "CONTENT_CODE", "code": "const x = 42;\nconsole.log(x);", "language": "javascript" },
    { "type": "CONTENT_QUIZ", "question": "What is X?", "options": [{"label": "A", "correct": false}, {"label": "B", "correct": true}, {"label": "C", "correct": false}], "explanation": "B is correct because..." }
  ]
}
```

Content block `source` field must be one of: `x`, `linkedin`, `instagram`, `facebook`, `threads`, `bluesky`.

**CONTENT_SUBTEXT** - use for captions, footnotes, or secondary text that should appear smaller and dimmer than body text.

**CONTENT_CODE** - use for code snippets. The `language` field enables syntax highlighting (supported: `javascript`, `typescript`, `python`, `json`, `html`, `css`, `bash`, `go`, `rust`, `swift`, `kotlin`). Omit `language` for plain monospace rendering.

**CONTENT_QUIZ** - interactive quiz. Question with 2-5 multiple-choice options. Exactly one option must have `correct: true`. `explanation` is optional, shown after the user answers. Keep questions topical to surrounding content.

---

## Card Structure Rules (CRITICAL)

These rules define the minimum structure for every card. Violating them produces broken-looking cards in the app.

### Feed Opener Card (order 0)

Every feed starts with a FULL_IMAGE card at order 0.

```json
{
  "_id": "<uuid>",
  "feedId": "<feed-id>",
  "order": 0,
  "variants": [
    {
      "type": "FULL_IMAGE",
      "imageSrc": "<same image URL as feed's imageSrc>",
      "title": "<Feed Title>",
      "subtitle": "<Feed Description>"
    }
  ]
}
```

**MANDATORY: The FULL_IMAGE opener card (order 0) MUST always have both `title` and `subtitle` populated.** The `title` comes from the feed's title, and the `subtitle` comes from the feed's `description` field. Never omit `subtitle` on the first card of any feed. A title without subtitle text below it looks broken in the app.

The FULL_IMAGE card reuses the same image URL as the feed's `imageSrc` - they share the same image.

### CONTENT Card Rules

1. **backgroundSrc is REQUIRED** - every CONTENT variant MUST have a `backgroundSrc` URL from `permanent_content/backgrounds.md`. It renders as a full-bleed image behind the glass card with a dark overlay for readability. One background per feed, shared across all CONTENT cards in that feed, unique across feeds.

2. **Minimum CONTENT structure** - every CONTENT variant MUST have at least `CONTENT_TITLE` + `CONTENT_TEXT`. A title alone or text alone is not enough. The ideal CONTENT card is `CONTENT_IMAGE` + `CONTENT_TITLE` + `CONTENT_TEXT` - image as hero, title as heading, text as body. Always aim for this full combo, especially when the card is the first (or only) variant.

3. **150-word minimum on CONTENT_TEXT** - the app's `splitContentCards` function automatically breaks oversized CONTENT variants into horizontal swipe sub-variants. If the text is too short (< 150 words), a split could produce a sub-variant with only a `CONTENT_TITLE` and no text beneath it. This looks broken. If a card has less than 150 words of content, merge it with the adjacent card.

4. **Title never alone** - a `CONTENT_TITLE` must never appear as the only visible text on a card or sub-variant. There must always be `CONTENT_TEXT` directly below it. This applies to all card types: FULL_IMAGE must have subtitle, CONTENT must have text after title.

5. **Never CONTENT_TITLE without CONTENT_TEXT** - a title with no accompanying text is meaningless. If you have a title, you must have at least 2-3 sentences of text below it. No exceptions.

6. **Never CONTENT_IMAGE alone in a CONTENT variant** - if a card is just a single image with no text, it must be a `FULL_IMAGE` variant, not a CONTENT variant with a lone `CONTENT_IMAGE` block. CONTENT variants exist for rich text layouts - use them for text.

7. **CONTENT_IMAGE goes first** - when a CONTENT variant includes an image, place the `CONTENT_IMAGE` block **first** (above the title and text). This creates a visually appealing layout with the image as a hero element followed by the text content.

8. **First variant in multi-variant cards** - when a card has multiple variants and the first variant is CONTENT type, it MUST include a `CONTENT_IMAGE` above the title and text. This ensures the card has a strong visual lead when the user first sees it. If you don't have an image for the first variant, make it a `FULL_IMAGE` variant instead.

9. **Text on second+ variants** - when a card has multiple variants and a CONTENT variant is not the first one (e.g., the user swipes to it), it still needs `CONTENT_TITLE` + `CONTENT_TEXT` at minimum. The image is optional on non-first variants, but the text is not.

10. **Do NOT manually split long text** - the app's `splitContentCards` function automatically breaks oversized CONTENT variants into horizontal swipe variants at runtime. Write the full content in one variant per card. However, if a card covers two genuinely distinct sub-topics, using 2 CONTENT variants is fine as an editorial choice.

11. **ASCII only** - NEVER use em dashes, en dashes, double hyphens (`--`), smart quotes, or any non-ASCII characters (charCode > 127). Use a single regular dash (`-`), colon (`:`), or comma (`,`) instead of em dashes or double hyphens, depending on context. Use plain quotes (`"`) instead of smart quotes. For accented names, use their ASCII approximation. This prevents rendering issues where unsupported characters display as `?`.

12. **No empty optional fields** - don't include optional fields with empty strings. Omit them entirely.

13. **CONTENT_TEXT** - can be multiple paragraphs separated by `\n\n` (renders as a compact 12px gap between paragraphs). 150-300 words per text block is ideal. Avoid excessive `\n\n` breaks - use them only for true paragraph boundaries, not between every sentence.

14. **imageSrc URLs must be valid URLs** - the Zod validator requires `.url()` format.

15. **Feed imageSrc** - every feed must have an `imageSrc` URL (used as the feed cover image in the app).

### CONTENT_SOCIAL Block Rules

Cards with social media content follow a specific layout pattern.

16. **CONTENT_SOCIAL goes first** - the `CONTENT_SOCIAL` block must be the first block in the variant. It acts as the attribution header (avatar, name, platform). Everything after it is the social post content.

17. **Social card structure** - after the `CONTENT_SOCIAL` block, include the post content in order:
    - `CONTENT_TEXT` - the post text / quote (required)
    - `CONTENT_IMAGE` - post image, if the social post included one (optional)
    - `CONTENT_SUBTEXT` - engagement stats, date, or context note (optional)

    Valid social card combos:
    - `CONTENT_SOCIAL` -> `CONTENT_TEXT` (minimal: just a text post)
    - `CONTENT_SOCIAL` -> `CONTENT_TEXT` -> `CONTENT_IMAGE` (text post with image)
    - `CONTENT_SOCIAL` -> `CONTENT_TEXT` -> `CONTENT_SUBTEXT` (text post with caption/date)
    - `CONTENT_SOCIAL` -> `CONTENT_TEXT` -> `CONTENT_IMAGE` -> `CONTENT_SUBTEXT` (full post)

18. **Never CONTENT_SOCIAL alone** - a social attribution block without any post content is empty. Always follow it with at least `CONTENT_TEXT`.

### Valid Block Combinations Summary

| Pattern | Blocks | Use when |
|---|---|---|
| **Standard text card** | `CONTENT_IMAGE` -> `CONTENT_TITLE` -> `CONTENT_TEXT` | Default for most content. Hero image + heading + body. |
| **Text-only card** | `CONTENT_TITLE` -> `CONTENT_TEXT` | When no image is available or on non-first variants. |
| **Social post** | `CONTENT_SOCIAL` -> `CONTENT_TEXT` | Quoting a social media post. |
| **Social post with image** | `CONTENT_SOCIAL` -> `CONTENT_TEXT` -> `CONTENT_IMAGE` | Social post that included a photo. |
| **Code card** | `CONTENT_TITLE` -> `CONTENT_TEXT` -> `CONTENT_CODE` | Explaining code. Title + explanation + snippet. |
| **Rich text card** | `CONTENT_IMAGE` -> `CONTENT_TITLE` -> `CONTENT_TEXT` -> `CONTENT_SUBTEXT` | Full card with footnote/caption. |
| **Quiz card** | `CONTENT_TITLE` -> `CONTENT_QUIZ` | Testing knowledge. Title as heading, quiz as interaction. Must include `backgroundSrc`. |

**Note:** Every `CONTENT_IMAGE` block must include `"sizing"`. Use `"wide"` as the default for hero images. Valid values: `automatic`, `wide`, `portrait`, `square`, `small_portrait`.

**Never valid:**
- `CONTENT_TITLE` alone (no text)
- `CONTENT_IMAGE` alone (use FULL_IMAGE variant)
- `CONTENT_SOCIAL` alone (no post content)
- `CONTENT_TEXT` alone without `CONTENT_TITLE` (needs a heading)
- `CONTENT_QUIZ` alone (needs a `CONTENT_TITLE` heading)

---

## Content Cards Within Each Feed (4-8 cards)

| Card | Type | Structure |
|---|---|---|
| Card 1 (order 0) | `FULL_IMAGE` | **MUST** reuse feed title as `title` and feed description as `subtitle` (never omit subtitle). `imageSrc` uses the same URL as the feed cover. |
| Cards 2-N (order 1+) | `CONTENT` | `CONTENT_TITLE` + `CONTENT_TEXT`, optionally with `CONTENT_IMAGE`, `CONTENT_SUBTEXT`, `CONTENT_CODE` |

**Card 1 - FULL_IMAGE opener:**

```json
{
  "_id": "<uuid>",
  "feedId": "<topic-slug>-<feed-slug>",
  "order": 0,
  "variants": [
    {
      "type": "FULL_IMAGE",
      "imageSrc": "<feed cover image URL>",
      "title": "<Feed Title>",
      "subtitle": "<Feed Description>"
    }
  ]
}
```

**Cards 2-N - CONTENT cards:**

```json
{
  "_id": "<uuid>",
  "feedId": "<topic-slug>-<feed-slug>",
  "order": 1,
  "variants": [
    {
      "type": "CONTENT",
      "backgroundSrc": "<background URL from permanent_content/backgrounds.md>",
      "blocks": [
        { "type": "CONTENT_TITLE", "title": "<Engaging Heading>" },
        { "type": "CONTENT_TEXT", "text": "<150-300 words of content based on research>" }
      ]
    }
  ]
}
```

**CONTENT card with hero image:**

```json
{
  "_id": "<uuid>",
  "feedId": "<topic-slug>-<feed-slug>",
  "order": 2,
  "variants": [
    {
      "type": "CONTENT",
      "backgroundSrc": "<background URL>",
      "blocks": [
        { "type": "CONTENT_IMAGE", "imageSrc": "<image URL>", "alt": "Description", "sizing": "wide" },
        { "type": "CONTENT_TITLE", "title": "<Heading>" },
        { "type": "CONTENT_TEXT", "text": "<150-300 words>" }
      ]
    }
  ]
}
```

---

## Quiz Feed (when "Dedicated quiz feed" is selected)

Create an additional feed as the last feed in the fork:

```json
{
  "_id": "<topic-slug>-quiz",
  "title": "Quiz",
  "description": "Test your knowledge of <Topic>",
  "imageSrc": "<quiz-appropriate image URL>",
  "mode": "sequential",
  "scrollDirection": "vertical",
  "engagement": true
}
```

**Number of quiz cards = number of content feeds.** Each quiz card covers one content feed.

**Each quiz card is a multi-variant card:**

```json
{
  "_id": "<uuid>",
  "feedId": "<topic-slug>-quiz",
  "order": 0,
  "variants": [
    {
      "type": "FULL_IMAGE",
      "imageSrc": "<that feed's cover image URL>",
      "title": "<Feed Title>",
      "subtitle": "<Feed Description>"
    },
    {
      "type": "CONTENT",
      "backgroundSrc": "<that feed's background URL>",
      "blocks": [
        { "type": "CONTENT_TITLE", "title": "Question 1" },
        {
          "type": "CONTENT_QUIZ",
          "question": "What is the main argument about X?",
          "options": [
            { "label": "Option A", "correct": false },
            { "label": "Option B", "correct": true },
            { "label": "Option C", "correct": false },
            { "label": "Option D", "correct": false }
          ],
          "explanation": "Option B is correct because..."
        }
      ]
    },
    {
      "type": "CONTENT",
      "backgroundSrc": "<that feed's background URL>",
      "blocks": [
        { "type": "CONTENT_TITLE", "title": "Question 2" },
        {
          "type": "CONTENT_QUIZ",
          "question": "...",
          "options": [
            { "label": "...", "correct": false },
            { "label": "...", "correct": true },
            { "label": "...", "correct": false }
          ],
          "explanation": "..."
        }
      ]
    }
  ]
}
```

**Quiz rules:**
- **MANDATORY: The FULL_IMAGE variant (variant[0]) MUST have both `title` and `subtitle`.** The `title` is the content feed's title and `subtitle` is the content feed's description. Never omit subtitle.
- Each quiz card's CONTENT variants use the `backgroundSrc` from the content feed they cover. Quiz card 0 (covering feed 1) uses feed 1's background, quiz card 1 (covering feed 2) uses feed 2's background, etc.
- Variant[0] is FULL_IMAGE (feed cover), variants[1+] are CONTENT quiz questions (user swipes right through them)
- **3-9 quiz questions per card** - aim for ~5 as the sweet spot
- Each quiz variant has `CONTENT_TITLE` (e.g., "Question 1") + `CONTENT_QUIZ`
- 3-4 options per question, exactly one `correct: true`
- Always include `explanation` - explains why the correct answer is correct
- Questions must test facts verified during research
- Incorrect options must be plausible but verifiably wrong
- Mix question types: factual recall, concept understanding, application, sequence/timeline

---

## Copyright Rules (for Book/Story content type)

When the content type is Book/Story, the generated content is a **review/summary**, NOT a reproduction. All text must be original writing that discusses the source material's ideas:

- **NEVER reproduce exact sentences or paragraphs** from the source - always paraphrase in your own words
- **NEVER include direct quotes** from the source. Instead, describe what the author argues or explains
- **Describe concepts, don't copy them** - explain the author's ideas as a reviewer/summarizer would
- **Statistics, dates, and proper nouns are fine** - factual data is not copyrightable
- **The tone should read like an insightful review** - someone who deeply understands the material explaining it to a friend
- **Quiz questions** should test understanding of concepts, not recall of exact wording

---

## Overwrite Protection

Before writing the file, check if `manifests/<topic-slug>.json` already exists. If it does, warn the user and ask whether to overwrite or pick a different name (e.g., `<topic-slug>-v2.json`).

---

## Validation Rules (forkfeed server Zod schemas)

### Content block type safety (CRITICAL)

Before writing the final JSON, extract every unique `type` value from all `blocks` arrays across all cards. Then read the `ContentBlock.__resolveType` switch statement in `../forkfeed-app/app-server/src/graphql/resolvers/index.ts` and verify that **every block type in the manifest has a matching case**. If any block type is missing from the resolver, **stop and add the missing case to the resolver before proceeding**. This prevents the "Abstract type must resolve to an Object type at runtime" error that breaks the entire feed.

The allowed block types as of now are: `CONTENT_IMAGE`, `CONTENT_TEXT`, `CONTENT_TITLE`, `CONTENT_VIDEO`, `CONTENT_SOCIAL`, `CONTENT_SUBTEXT`, `CONTENT_CODE`, `CONTENT_QUIZ`, `CONTENT_BUTTON`. If you introduce a new block type, you MUST add it to the resolver first.

### Standard validation

These are enforced server-side. Generating invalid data will cause upload failures:

- Fork/Feed `_id`: string, min 1 char, kebab-case (must match `/^[a-z0-9-]+$/`)
- Card `_id`: string, UUID v4 format (must match `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`)
- `feedId`: string, min 1 char
- `order`: integer, min 0
- `variants`: array, min 1 item
- `FULL_IMAGE.imageSrc`: must be a valid URL
- `FULL_VIDEO.videoSrc`: must be a valid URL
- `CONTENT.blocks`: array, min 1 block
- `CONTENT_TEXT.text`: min 1 char
- `CONTENT_TITLE.title`: min 1 char
- `CONTENT_IMAGE.imageSrc`: must be a valid URL
- `CONTENT_IMAGE.sizing`: required, must be one of `automatic`, `wide`, `portrait`, `square`, `small_portrait`
- `CONTENT_VIDEO.videoSrc`: must be a valid URL
- `CONTENT_SOCIAL.source`: must be one of `x`, `linkedin`, `instagram`, `facebook`, `threads`, `bluesky`
- `CONTENT_SOCIAL.avatarSrc`: must be a valid URL
- `CONTENT_SOCIAL.name`: min 1 char
- `CONTENT_SUBTEXT.text`: min 1 char
- `CONTENT_CODE.code`: min 1 char
- `CONTENT_CODE.language`: string, optional
- `CONTENT_QUIZ.question`: min 1 char
- `CONTENT_QUIZ.options`: array, min 2 items
- `CONTENT_QUIZ.options[].label`: min 1 char
- `CONTENT_QUIZ.options[].correct`: boolean (exactly one must be `true`)
- `CONTENT_QUIZ.explanation`: string, optional
- Feed `title`: min 1, max 200 chars
- Feed `description`: min 1, max 5000 chars
- Feed `imageSrc`: valid URL (required - used as feed hero image in the app)
- Feed `mode`: `"sequential"` or `"random"`
- Feed `scrollDirection`: `"vertical"` (required)

---

## Complete Example (1 fork, 1 feed, 3 cards)

```json
{
  "forks": [
    {
      "_id": "demo",
      "title": "Demo Topic",
      "description": "A short demo fork showing the content structure.",
      "imageSrc": "https://images.unsplash.com/photo-1516979187457-637abb4f9353",
      "feedIds": ["demo-origins"]
    }
  ],
  "feeds": [
    {
      "_id": "demo-origins",
      "title": "Origins",
      "description": "How it all began - the spark that started everything.",
      "imageSrc": "https://images.unsplash.com/photo-1516979187457-637abb4f9353",
      "mode": "sequential",
      "scrollDirection": "vertical",
      "engagement": true
    }
  ],
  "cards": [
    {
      "_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "feedId": "demo-origins",
      "order": 0,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "https://images.unsplash.com/photo-1516979187457-637abb4f9353",
          "title": "Origins",
          "subtitle": "How it all began - the spark that started everything."
        }
      ]
    },
    {
      "_id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "feedId": "demo-origins",
      "order": 1,
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://{{CDN_DOMAIN}}/content/backgrounds/warm-amber.jpeg",
          "blocks": [
            {
              "type": "CONTENT_IMAGE",
              "imageSrc": "https://images.unsplash.com/photo-1507842217343-583bb7270b66",
              "alt": "Bookshelves filled with old volumes",
              "sizing": "wide"
            },
            { "type": "CONTENT_TITLE", "title": "The First Chapter" },
            {
              "type": "CONTENT_TEXT",
              "text": "This is the opening paragraph. It sets the scene and draws the reader in with vivid detail and emotional weight. The content continues with enough depth to meet the 150-word minimum, ensuring the app's splitContentCards function never produces an orphaned title.\n\nThis is the second paragraph. It deepens the narrative and adds context from the research phase. Every claim here was verified through web research, not drawn from training data alone."
            }
          ]
        }
      ]
    },
    {
      "_id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
      "feedId": "demo-origins",
      "order": 2,
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
          "title": "The Summit"
        },
        {
          "type": "CONTENT",
          "backgroundSrc": "https://{{CDN_DOMAIN}}/content/backgrounds/warm-amber.jpeg",
          "blocks": [
            {
              "type": "CONTENT_IMAGE",
              "imageSrc": "https://images.unsplash.com/photo-1454496522488-7a8e488e8606",
              "alt": "A panoramic view from the summit",
              "sizing": "wide"
            },
            { "type": "CONTENT_TITLE", "title": "What It Means" },
            {
              "type": "CONTENT_TEXT",
              "text": "A multi-variant card. The user swipes right from the image to reach this deeper context. Use this pattern for image + explanation combos. The text here must also meet the 150-word minimum to prevent orphan titles in the app."
            }
          ]
        }
      ]
    }
  ]
}
```

---

## After Generating

Convert the manifest into typed fork files and validate it:

```bash
npm run convert -- manifests/<topic-slug>.json   # writes forks/<topic-slug>/*.ts + regenerates forks/index.ts
npm run typecheck                                 # the TS compiler validates the content
```

Tell the user:
- The manifest was saved to `manifests/<topic-slug>.json` and converted to `forks/<topic-slug>/`
- Deploy with `/server-actions` (Deploy), then make it visible with `/server-actions` (Publish a fork) using the deployed worker URL
- Show a summary: number of feeds, number of cards, variant type breakdown, number of quiz questions (if any)
