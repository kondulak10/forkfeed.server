---
name: generate-book
description: Convert a book into forkfeed content with chapter feeds, content cards, and a quiz feed
user_invocable: true
---

# /generate-book

Convert any book into rich forkfeed content - chapter-based feeds with text cards, a dedicated quiz feed, and AI-generated images uploaded to CDN. Research, content generation, and image prompt creation are always included. Image generation via Google Flow, CDN upload, and JSON finalization are optional - the user can run `/generate-images` separately later.

## How to use

The user says `/generate-book`. If a book name is passed inline (e.g., `/generate-book Atomic Habits`), skip the question and go straight to research.

The skill runs in phases: **(1) Ask -> (2) Research -> (3) Generate Content -> (4) Generate Images (optional) -> (5) Finalize (optional)**. Phases 1-3 always run. Phases 4-5 only run if the user chooses the full image flow in Question 4.

---

## Phase 1 - Ask (3 questions)

Ask these three questions using `AskUserQuestion`, one at a time.

### Question 1 - Book Name

**"What book do you want to convert into forkfeed content?"**

No predefined options - free text. Prompt with examples:
- "Atomic Habits" by James Clear
- "The Great Gatsby" by F. Scott Fitzgerald
- "Sapiens" by Yuval Noah Harari

If the user passed a book name with the command (e.g., `/generate-book Atomic Habits`), skip this and go to Question 2.

### Question 2 - Image Character

**"What character should appear in the images?"**

Options:
- **Ghost figure** - A semi-transparent smoky silhouette (the default forkfeed character). Melancholic, thoughtful, works with any book theme.
- **Describe your own** - You describe a custom recurring character and I'll use it consistently across all image prompts.

If the user picks "Ghost figure", use the default ghost character description in the prompt template (see Image Prompts section).

If the user picks "Describe your own", ask them to describe the character in detail - appearance, form, mood, how it interacts with objects. Then replace the `{CHARACTER_DESCRIPTION}` section in the prompt template with their description. It should be written in the same dense, flowing, comma-separated prose style as the default ghost description.

### Question 3 - Buy Link

**"Do you have a link where readers can buy this book? (e.g., Amazon URL)"**

Options:
- **Provide a URL** - The user pastes a direct link to the book (Amazon, publisher site, etc.)
- **Skip** - Auto-generate an Amazon search URL: `https://www.amazon.com/s?k=<book+name>+<author>` (URL-encode the search terms)

The resulting URL is used as `actionUrl` on the fork, with `actionLabel` set to `"Buy the book"`.

### Question 4 - Image Generation

**"Should I generate images via Google Flow, or just create the prompts file?"**

Options:
- **Full image flow** - Generate images in Google Flow, download, upload to CDN, replace placeholders in JSON. End-to-end automated.
- **Prompts only** (Recommended) - Generate the `content/<book-slug>-images.md` prompts file and stop after Phase 3. You can run `/generate-images` later to generate and upload images separately.

If the user picks "Prompts only", Phases 4 and 5 are skipped entirely. The JSON will contain `IMAGE N` and `FORK` placeholders until cover images are generated and uploaded later. Background images are already resolved (direct CDN URLs from the catalog).

### Hardcoded Defaults (never asked)

| Parameter | Value |
|---|---|
| Content type | Book |
| Structure | By chapters / logical sections |
| Scale | 5–10 feeds (aim for 10: 9 chapter + 1 quiz) |
| Tone | Storytelling (vivid, narrative, engaging) |
| Images | Prompts always generated; Google Flow + CDN upload only if user chooses "Full image flow" |
| Quizzes | Dedicated quiz feed (always the last feed) |

---

## Phase 2 - Mandatory Research

This phase runs AFTER the book name is confirmed and BEFORE content generation. It is **never optional**. All factual content must be sourced from live web research - training data may only supplement writing style and transitions.

### Why Research is Mandatory

- Training data may contain outdated facts, incorrect details, or stale information about editions, adaptations, and reception
- Even "well-known" books have evolving details - new editions, updated forewords, recent adaptations, revised sales figures
- The user expects accurate, verifiable content - not a rephrasing of potentially stale training data
- This phase runs for EVERY book, EVERY time, no exceptions

### Research Rules

- **Never open a browser** - all research is done via background agents using `WebSearch` and `WebFetch` tools. Do not use any browser automation or MCP chrome tools.
- **Always use background agents** - research agents run in the background (`run_in_background: true`) so the user is not blocked.
- **No training data as primary source** - training data may only supplement writing style and framing, never factual claims.

### Step 1 - Launch Research

After confirming the book name, present the research plan and launch immediately. Do NOT wait for user approval:

> "Before generating content, I'll research **{Book Name}** thoroughly. Launching 5 research agents:"
> 1. Plot & Structure
> 2. Characters / Key Figures
> 3. Themes & Key Ideas
> 4. Author & Context
> 5. Reception & Impact
> "Researching now..."

### Step 2 - Parallel Research Agents

Launch **5 background agents** (`run_in_background: true`), all in a single message:

- **Agent 1: Plot & Structure** - Chapter summaries, act structure, key plot points, narrative arc, how the book is organized (parts, chapters, sections)
- **Agent 2: Characters / Key Figures** - Main and supporting characters (fiction) or key people/case studies (non-fiction), relationships, arcs, motivations
- **Agent 3: Themes & Key Ideas** - Central arguments, literary themes, key insights, symbolism, main takeaways, memorable quotes
- **Agent 4: Author & Context** - Author biography, why they wrote it, historical/cultural context, writing process, publication history
- **Agent 5: Reception & Impact** - Critical reception, awards, sales figures, cultural impact, adaptations (film, TV, etc.), reader community, legacy

**Each agent receives this prompt template:**

```
Research the following aspect of the book "{Book Name}" by {Author}: {specific research angle}

Use WebSearch to find current, authoritative sources. For each promising search result,
use WebFetch to read the full page content. Do NOT rely on search snippets alone.

Research guidelines:
1. Perform at least 3–5 different WebSearch queries, refining terms based on initial results
2. Use WebFetch on at least 3–4 of the most relevant results for detailed information
3. Prioritize: official sources, publisher pages, reputable reviews, author interviews
4. For statistics/numbers: find the most recent data and note the source + date
5. For adaptations/editions: verify current availability and recent developments
6. Focus on content that can be turned into engaging card text

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

### Sources Used
- [Title](URL) - what was found here
...
```

### Step 3 - Synthesize Research

After all agents complete:

1. **Collect all agent outputs** into a single Research Brief
2. **Resolve conflicts** - if agents found contradictory facts, use the more authoritative or recent source
3. **Determine book type** - classify as **fiction** or **non-fiction** based on research (this affects writing style in Phase 3)
4. **Plan feed structure** - based on the book's chapter/section organization, decide how to split into 5-9 feeds (group chapters if the book has many)
5. **Identify gaps** - if a planned feed has insufficient research, run 1-2 additional targeted `WebSearch` + `WebFetch` calls
6. **Show Research Summary** (5-10 lines):
   > "Research complete. Consulted {N} sources across 5 research angles."
   > "Book type: {Fiction / Non-fiction}"
   > "Planned structure: {N} chapter feeds + 1 quiz feed"
   > "Key findings: {2-3 most interesting discoveries}"
   > "Proceeding to content generation..."

### Research Quality Gate

Before proceeding to generation, verify:

1. **Minimum 10 unique web sources** consulted across all agents (via WebFetch, not just search snippets)
2. **Every planned feed** has at least 2-3 verified facts backing it
3. **No orphan feeds** - if a feed has zero research backing, run additional research or merge the feed

If the quality gate fails, run additional targeted research before proceeding.

### How Research Flows into Content

1. **Every `CONTENT_TEXT` block** must be based on facts found during research
2. **Statistics and numbers** must come from research with identifiable sources. If not found, omit or describe qualitatively
3. **Names, places, and events** must be verified through research
4. **Quiz questions** must test facts verified during research. Wrong options must be plausible but verifiably incorrect
5. **Training data as supplement only** - used for writing style, transitions, and framing, never as source of factual claims
6. **When in doubt, omit** - fewer accurate facts beats more unreliable ones

### Copyright Rules (CRITICAL)

The generated content is a **review/summary** of the book, NOT a reproduction. All text must be original writing that discusses the book's ideas. Strict rules:

- **NEVER reproduce exact sentences or paragraphs** from the book - always paraphrase in your own words
- **NEVER include direct quotes** from the book, even short ones. Instead, describe what the author argues or explains. For example, instead of quoting "You do not rise to the level of your goals. You fall to the level of your systems." write something like "Clear argues that people don't achieve their ambitions through goals alone - they default to the quality of their daily systems."
- **Describe concepts, don't copy them** - explain the author's ideas as a reviewer/summarizer would, using your own language and framing
- **Statistics, dates, and proper nouns are fine** - factual data is not copyrightable (e.g., "published in 2018", "sold 25 million copies", "Dave Brailsford" are all fine)
- **Book structure and chapter names** can be referenced but not quoted verbatim at length
- **The tone should read like an insightful book review** - someone who deeply understands the material explaining it to a friend, not a transcript of the book itself
- **For `CONTENT_SUBTEXT`** - do NOT use book quotes. Instead, use editorial commentary, interesting context, or a concise takeaway written in your own words
- **Quiz questions** should test understanding of concepts, not recall of exact wording

---

## Phase 3 - Content Generation

### Pre-generation Setup

Before generating content:

**1. Pre-generate UUIDs:**

```bash
node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\n')"
```

Replace `N` with the planned total card count (chapter feeds cards + quiz cards). Assign one UUID per card.

**2. Read background catalog:**

Read `permanent_content/backgrounds.md` to get the list of available background images (BG 1-39). Each background has colors, scene description, CDN URL, and mood. You will assign one background per feed, matching the background's mood to the feed's theme.

**CDN_DOMAIN resolution:** URLs in `permanent_content/` files use `{{CDN_DOMAIN}}` as a placeholder. Read `CDN_DOMAIN` from `.dev.vars` and replace `{{CDN_DOMAIN}}` with its value when constructing image URLs. If `CDN_DOMAIN` is not set, ask the user for their CDN domain before proceeding.

Rules:
- **One background per feed** - all CONTENT variants within a feed share the same `backgroundSrc`
- **Unique across feeds** - each feed uses a different background. No two feeds share a BG.
- **Match by mood** - read the background's mood and scene description. Pick the one that best fits the feed's theme and emotional tone.
- **Quiz feed backgrounds** - quiz card CONTENT variants use the `backgroundSrc` from the chapter feed they cover (not a single BG for the whole quiz feed). Quiz card 0 (covering feed 1) uses feed 1's background, quiz card 1 (covering feed 2) uses feed 2's background, etc.

### Book Type Adaptation

Based on research findings, adapt the writing style:

**Fiction books:**
- Focus on narrative retelling - plot beats, character moments, key scenes, dramatic tension
- Use vivid, immersive language that captures the story's atmosphere
- Card titles reference scenes or turning points (e.g., "When Bilbo Met Gollum", "The Fall of Troy")
- Include memorable quotes from the text where found in research

**Non-fiction books:**
- Focus on key insights extraction - arguments, frameworks, findings, actionable takeaways
- Use clear, engaging language that makes concepts accessible
- Card titles reference ideas or principles (e.g., "The Power of Habit Loops", "Why Nations Fail")
- Include relevant statistics and real-world examples from research

The card structure is identical either way - only the writing approach changes.

### Output Files (Phase 3)

Phase 3 generates **three intermediate files**:

1. `manifests/<book-slug>.json` - forkfeed content with `IMAGE N` and `FORK` placeholder references for cover images (replaced with real CDN URLs in Phase 5). Background images use direct CDN URLs from the catalog.
2. `content/<book-slug>-images.md` - numbered image generation prompts (consumed by Phase 4)
3. `content/<book-slug>-images.html` - HTML table with copy buttons for each prompt (for manual image generation workflow)

Before writing, check if any of these files already exist. If so, warn the user and ask whether to overwrite or use a `-v2` suffix.

---

### Fork

One fork per book:

```json
{
  "_id": "<book-slug>",
  "title": "<Book Name>",
  "description": "<150-200 characters compelling summary of the book>\n\nAll rights belong to the author and publisher. This is a summary/review, buy the book below from the author.",
  "imageSrc": "FORK",
  "feedIds": ["<book-slug>-<feed1-slug>", ..., "<book-slug>-quiz"],
  "actionLabel": "Buy the book",
  "actionUrl": "<buy-url>"
}
```

- `_id`: kebab-case slug of the book name (e.g., `atomic-habits`, `the-great-gatsby`)
- `title`: the full book name
- `description`: starts with a compelling summary, followed by copyright notice and CTA. Format: `"<summary>\n\nAll rights belong to the author and publisher. This is a summary/review, buy the book below from the author."`. Total length 150-250 characters.
- `feedIds`: all chapter feed IDs in order, with the quiz feed last
- `actionLabel`: always `"Buy the book"`
- `actionUrl`: the buy link from Question 3 (user-provided URL or auto-generated Amazon search URL)

### Chapter Feeds (5-9 feeds)

Split the book into logical sections. If the book has fewer than 10 chapters, each feed maps to one chapter. If it has more, group related chapters into thematic feeds to stay within the 5-9 range.

```json
{
  "_id": "<book-slug>-<feed-slug>",
  "title": "<Section Title>",
  "description": "<50-100 characters describing this section>",
  "imageSrc": "IMAGE N",
  "mode": "sequential",
  "scrollDirection": "vertical",
  "engagement": true
}
```

- `title`: an engaging name for the section (not just "Chapter 3" - use the actual topic, e.g., "The Habit Loop")
- `description`: 50-100 characters, concise hook for the section

### Cards Within Each Chapter Feed (5-10 cards)

| Card | Type | Structure |
|---|---|---|
| Card 1 (order 0) | `FULL_IMAGE` | **MUST** reuse feed title as `title` and feed description as `subtitle` (never omit subtitle). `imageSrc` uses the same `IMAGE N` as the feed cover. |
| Cards 2-N (order 1+) | `CONTENT` | `CONTENT_TITLE` + `CONTENT_TEXT`, optionally with `CONTENT_SUBTEXT` |

**Card 1 - FULL_IMAGE opener:**

```json
{
  "_id": "<uuid>",
  "feedId": "<book-slug>-<feed-slug>",
  "order": 0,
  "variants": [
    {
      "type": "FULL_IMAGE",
      "imageSrc": "IMAGE N",
      "title": "<Feed Title>",
      "subtitle": "<Feed Description>"
    }
  ]
}
```

The FULL_IMAGE card reuses the same IMAGE reference as the feed's `imageSrc` - they share the same image.

**MANDATORY: The FULL_IMAGE opener card (order 0) MUST always have both `title` and `subtitle` populated.** The `title` comes from the feed's title, and the `subtitle` comes from the feed's `description` field. Never omit `subtitle` on the first card of any feed. A title without subtitle text below it looks broken in the app.

**Cards 2-N - CONTENT cards:**

```json
{
  "_id": "<uuid>",
  "feedId": "<book-slug>-<feed-slug>",
  "order": 1,
  "variants": [
    {
      "type": "CONTENT",
      "backgroundSrc": "<CDN URL from permanent_content/backgrounds.md>",
      "blocks": [
        { "type": "CONTENT_TITLE", "title": "<Engaging Heading>" },
        { "type": "CONTENT_TEXT", "text": "<100-300 words of content based on research>" }
      ]
    }
  ]
}
```

- `backgroundSrc` is a direct CDN URL from `permanent_content/backgrounds.md`, selected during pre-generation setup. All CONTENT cards within a feed share the same `backgroundSrc`. Each feed uses a different background, matched by mood.

**CONTENT card rules:**
- Every CONTENT variant MUST have `CONTENT_TITLE` + `CONTENT_TEXT` at minimum
- `CONTENT_TEXT` should be 150-300 words (minimum 150). Use `\n\n` for paragraph breaks only at true boundaries. The 150-word minimum ensures the app's `splitContentCards` function never produces a sub-variant with only a `CONTENT_TITLE` and no text beneath it. If a card has less than 150 words of content, merge it with the adjacent card
- `CONTENT_SUBTEXT` is optional - use for editorial commentary, fun facts, or concise takeaways (NOT book quotes - see Copyright Rules)
- `CONTENT_TITLE` should be an engaging heading about the specific topic of that card, not generic
- **Title never alone** - a `CONTENT_TITLE` must never appear as the only visible text on a card or sub-variant. There must always be `CONTENT_TEXT` directly below it. If the app's `splitContentCards` function could split a card such that a title ends up orphaned at the bottom of one sub-variant with no text beneath it, add more content or restructure. This applies to all card types: FULL_IMAGE must have subtitle, CONTENT must have text after title.
- Do NOT manually split long text across multiple variants. The app's `splitContentCards` function automatically breaks oversized CONTENT variants into horizontal swipe variants at runtime. Write the full content in one variant per card.
- However, if a card covers two genuinely distinct sub-topics, using 2 CONTENT variants is fine as an editorial choice
- No `CONTENT_IMAGE` blocks - all images are `IMAGE N` references which aren't valid URLs. Use `FULL_IMAGE` cards for visual breaks.
- No empty optional fields - omit them entirely
- **ASCII only** - NEVER use em dashes, en dashes, double hyphens (`--`), smart quotes, or any non-ASCII characters (charCode > 127). Use a single regular dash (`-`), colon (`:`), or comma (`,`) instead of em dashes or double hyphens, depending on context. Use plain quotes (`"`) instead of smart quotes. For accented names, use their ASCII approximation (e.g., "Polgar" not "Polgar", "Brene" not "Brene"). This prevents rendering issues where unsupported characters display as `?`.

**Optional CONTENT_SUBTEXT example:**

```json
{
  "type": "CONTENT",
  "blocks": [
    { "type": "CONTENT_TITLE", "title": "The 1% Rule" },
    { "type": "CONTENT_TEXT", "text": "James Clear argues that..." },
    { "type": "CONTENT_SUBTEXT", "text": "Clear's central insight: your daily systems matter more than your ambitious goals." }
  ]
}
```

---

### Quiz Feed (always the last feed)

```json
{
  "_id": "<book-slug>-quiz",
  "title": "Quiz",
  "description": "Test your knowledge of <Book Name>",
  "imageSrc": "IMAGE N+1",
  "mode": "sequential",
  "scrollDirection": "vertical",
  "engagement": true
}
```

The quiz feed gets its own dedicated image (`IMAGE N+1` where N = number of chapter feeds) - thematically related to the fork cover but with a quiz/knowledge subject.

**Number of quiz cards = number of chapter feeds.** Each quiz card covers one chapter feed.

**Each quiz card is a multi-variant card:**

```json
{
  "_id": "<uuid>",
  "feedId": "<book-slug>-quiz",
  "order": 0,
  "variants": [
    {
      "type": "FULL_IMAGE",
      "imageSrc": "IMAGE N",
      "title": "<Chapter Feed Title>",
      "subtitle": "<Chapter Feed Description>"
    },
    {
      "type": "CONTENT",
      "backgroundSrc": "<CDN URL from chapter feed's background>",
      "blocks": [
        { "type": "CONTENT_TITLE", "title": "Question 1" },
        {
          "type": "CONTENT_QUIZ",
          "question": "What is the main argument in Chapter X?",
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
      "backgroundSrc": "<CDN URL from chapter feed's background>",
      "blocks": [
        { "type": "CONTENT_TITLE", "title": "Question 2" },
        {
          "type": "CONTENT_QUIZ",
          "question": "...",
          "options": [...],
          "explanation": "..."
        }
      ]
    }
  ]
}
```

**Quiz rules:**
- **MANDATORY: The FULL_IMAGE variant (variant[0]) of every quiz card MUST have both `title` and `subtitle` populated.** The `title` is the chapter feed's title and `subtitle` is the chapter feed's description. Never omit subtitle.
- Each quiz card's CONTENT variants use the `backgroundSrc` from the chapter feed they cover. Quiz card 0 (covering feed 1) uses feed 1's background URL, quiz card 1 (covering feed 2) uses feed 2's background URL, and so on. This gives each quiz section a visual tie to its corresponding chapter.
- Variants 2-N are CONTENT quiz questions (user swipes right through them)
- **3-9 quiz questions per chapter card** - aim for ~5 as the sweet spot
- Each quiz variant has `CONTENT_TITLE` (e.g., "Question 1") + `CONTENT_QUIZ`
- 3-4 options per question, exactly one `correct: true`
- Always include `explanation` - explains why the correct answer is correct
- Questions must test facts verified during research
- Incorrect options must be plausible but verifiably wrong
- Mix question types: factual recall, character/concept knowledge, theme understanding, sequence/timeline

---

## Image Prompts File

Generate a companion file `content/<book-slug>-images.md` with **complete, ready-to-copy image generation prompts** for each IMAGE reference.

Each prompt follows a strict template. The ONLY part that changes per image is the **Subject** section - everything else (art style, character, avoid list) stays identical across all prompts for the book.

### Prompt Template

Every prompt must follow this exact structure:

```
Bold abstract cartoon illustration on a dark background, stylized shapes with thick outlines and exaggerated proportions, slightly distorted perspective. Rich saturated colors that shift depending on the scene mood - this scene leans into warm amber golds, bright coral oranges and soft peach highlights. Colors blend through bold visible gradients, not flat fills - large sweeping color transitions across the chains, the sky and the birds. Geometric and organic forms mixed together, rounded edges on hard objects, flowing curves on natural elements like trees and hills. Modern subtle digital grain noise across the entire image - fine uniform matte dither like modern SaaS and AI app interfaces use, giving a soft tactile quality without looking vintage or photographic. Strong compositional contrast - large dark negative space against concentrated areas of vivid color. Lighting is stylized and exaggerated, light sources cast oversized colored shapes across surfaces and the character rather than realistic illumination. Inspired by modern editorial illustration and graphic novel aesthetics. Main character must be consistent, a semi-transparent ghostly human silhouette made of dark smoke or mist, no solid form just a soft translucent shape that loosely resembles a human figure with a head shoulders and upper body that trails off and dissolves into wispy tendrils at the bottom instead of legs, the entire figure is a dark smoky gradient from a slightly denser charcoal-purple core fading to transparent at the edges, no facial features at all except two faintly glowing soft white dots where eyes would be, the figure has a gentle slouch and organic flowing movement like smoke drifting in still air, edges are never sharp always soft and dissolving, the silhouette subtly picks up and reflects the surrounding scene colors through its translucent body so in warm scenes it gets hints of amber and orange drifting through it and in cool scenes it picks up blues and teals, it interacts with objects but its hands are just vague smoky suggestions, it leaves a faint wispy trail behind it as it moves, overall it feels like a quiet calm presence not scary or sinister but melancholic and thoughtful like a memory taking shape. Subject: the ghost figure standing in a vast open field at golden hour with both smoky arms raised upward releasing a flock of stylized origami birds made of bright coral and amber geometric shapes that scatter upward and outward into a wide open sky, broken chains made of heavy dark geometric links lie shattered on the ground around the figure's base where its wispy tendrils dissolve into the grass, the birds transition from warm coral near the figure to bright gold as they fly higher catching exaggerated sunlight, the sky is a dramatic gradient from deep indigo at the top through warm peach and amber at the horizon, the field stretches endlessly in all directions with soft rolling hills rendered in muted greens and warm yellows, golden light from the low sun on the left passes through the ghost's translucent body creating amber highlights drifting through its smoky form, a few origami birds circle close to the figure as if reluctant to leave while the rest soar freely, small wildflowers in bright pops of coral dot the grass, mood is liberating and defiant and joyfully free. Avoid photorealism, 3D rendering, glass morphism, bokeh, depth of field blur, muted desaturated palettes, watercolor washes, pencil sketching, stock photography aesthetics, thin delicate linework, vintage halftone dots, old film grain, screen print texture, clean textureless digital smoothness, horror aesthetic, skull faces, skeleton features, glowing red eyes, anything scary or sinister.
```

### Default Ghost Character


If the user described a custom character, use their description instead - written in the same dense, flowing, comma-separated prose style. That replaces the ghost character we have described in the "### Prompt Template"

### What You Customize Per Image

There are three parts to adapt for each scene:

1. **`{SCENE_COLORS}`** -3-4 colors that fit the mood of this specific scene (e.g., "deep forest greens, warm golden ambers and dusky indigo blues" for a nature scene, or "warm burnt oranges, deep burgundy reds and soft candlelight yellows" for an indoor evening scene)

2. **`{COLOR_SURFACES}`** - what the color gradients sweep across in this scene (e.g., "the sky, mountains and foliage" or "the walls, bookshelves and floor")

3. **`{SUBJECT_DESCRIPTION}`** - the full scene description, written in the same dense, flowing, comma-separated style as the example. This is where you describe what the ghost figure is doing, the environment, objects, lighting direction, mood, and any secondary elements. Match the level of detail and language style of this example:

> the ghost figure hiking a narrow mountain trail at golden hour, faint wispy backpack shape on its back, one smoky hand gripping a tall wooden walking stick the only solid object, towering stylized pines in deep greens and teals, sweeping mountain range with peaks fading into indigo and purple gradients, setting sun casting golden amber glow across the left bleeding into deep blue on the right with warm light passing through the translucent figure, wildflowers along the trail in bright magenta and orange, a small bird perched on the walking stick tip, the figure looking up toward a distant peak, faint trail dissipating behind it, mood is adventurous and peaceful and quietly lonely

### Subject Description Rules

- Write in the same dense, comma-separated flowing prose style as the example above
- Always include the ghost figure doing something relevant to the book's scene
- Describe environment, objects, lighting direction and color bleed, mood
- Include 1-2 small secondary details (a bird, a flower, a floating object) for visual interest
- Always end with a mood descriptor ("mood is X and Y and Z")
- **NO text, titles, book names, labels, or written words** in the scene
- Each scene must be visually distinct from the others - vary environments, lighting, color palettes, and what the ghost figure is doing
- Scenes should capture the emotional essence of that chapter/section, not literally depict every plot point

### FORK Image Prompt Override

The FORK cover image uses a DIFFERENT Subject than the chapter feed images. The FORK Subject should depict: a dramatic close-up of a large hardcover book filling roughly 70-80% of the frame, shot from a slightly low angle looking up at the front cover to give it visual weight and importance, the book cover features a rich detailed illustrated scene that captures the core theme of the book - this cover illustration should include the ghost character as part of a thematic scene on the cover doing something that represents the book's central idea (not just a small logo or emblem but a proper book cover illustration with environment and action), the cover illustration uses the book's theme colors with bold geometric patterns and shapes framing the scene, the book has visible thickness and a slightly open spine suggesting substance, the background behind the book is a simple soft gradient using muted versions of the book's theme colors to keep all attention on the cover, 2-3 small thematic objects float or rest near the book that hint at the book's subject matter (e.g. geometric seedlings for a habits book or stylized code brackets for a programming book), warm directional light from the upper left highlights the cover surface and casts a soft shadow behind the book, mood is bold and inviting and immediately communicative.

The cover illustration IS the key storytelling element - a viewer glancing at this image should instantly get a sense of what this book is about from the scene depicted on its cover. Do NOT make the ghost a tiny emblem. The ghost should be a full character within the cover's illustrated scene.

### File Format

```markdown
# <Book Name> - Image Prompts

## FORK - Fork cover

<complete cover prompt>

## IMAGE 1 - Feed 1: <Feed Title>

<complete cover prompt>

## IMAGE 2 - Feed 2: <Feed Title>

<complete cover prompt>

...

## IMAGE N+1 - Quiz

<complete cover prompt - thematically related to the fork cover>
```

### Image Numbering

- `FORK` = fork cover
- `IMAGE 1` through `IMAGE N` = one cover per chapter feed (reused as that feed's cover AND its Card 1 FULL_IMAGE)
- `IMAGE N+1` = quiz feed cover - thematically related to the fork cover (same art style and color palette, quiz/knowledge-testing subject)
- Total images = 1 (fork) + N+1 (feed covers including quiz) where N = number of chapter feeds
- Backgrounds are NOT generated - they come from the pre-made catalog at `permanent_content/backgrounds.md`, selected during Phase 3
- **Target aspect ratio**: All images must be 1:1 ratio (square, e.g., 800x800). Google Flow square mode generates natively at 1:1, no cropping needed. Feed cover images are also used by the app for end-of-feed continue cards, so correct ratio is critical.

### HTML Prompt Table

In addition to the `.md` file, generate a self-contained HTML file `content/<book-slug>-images.html` with a table for quick prompt copying during manual image generation.

The HTML file must:
- Be fully self-contained (inline CSS + JS, no external dependencies)
- Use a dark theme (`#1a1a2e` background) for comfortable use alongside image generation tools
- Have a table with 3 columns: **#**, **Location**, and a **Copy** button
- **Order: Fork first, then all IMAGE rows (1 through N+1, where N+1 is quiz)** - groups by type for easier matching with generated images
- Use separator lines between sections (fork / images)
- Store each full prompt text in a JavaScript array, referenced by row index
- Copy button uses `navigator.clipboard.writeText()` to copy the prompt
- On click, button text changes to "Copied" and gets a green style permanently (no setTimeout revert). Clicking again still copies the prompt
See `content/atomic-habits-images.html` for a reference implementation.

---

## ID Format

- **Fork ID**: kebab-case book slug. Regex: `/^[a-z0-9-]+$/`
- **Feed IDs**: `<book-slug>-<feed-slug>` kebab-case. Regex: `/^[a-z0-9-]+$/`
- **Card IDs**: UUID v4. Pre-generate with:
  ```bash
  node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\n')"
  ```

---

## Validation Rules

### Content block type safety (CRITICAL)

Before writing the final JSON, extract every unique `type` value from all `blocks` arrays across all cards. Then read the `ContentBlock.__resolveType` switch statement in `../forkfeed.app/app-server/src/graphql/resolvers/index.ts` and verify that **every block type in the manifest has a matching case**. If any block type is missing from the resolver, **stop and add the missing case to the resolver before proceeding**. This prevents the "Abstract type must resolve to an Object type at runtime" error that breaks the entire feed.

The allowed block types as of now are: `CONTENT_IMAGE`, `CONTENT_TEXT`, `CONTENT_TITLE`, `CONTENT_VIDEO`, `CONTENT_SOCIAL`, `CONTENT_SUBTEXT`, `CONTENT_CODE`, `CONTENT_QUIZ`, `CONTENT_BUTTON`. If you introduce a new block type, you MUST add it to the resolver first.

### Standard validation

These are enforced server-side when uploading. The generated JSON must comply (once `IMAGE N` references are replaced with real URLs):

- Fork/Feed `_id`: kebab-case, min 1 char, regex `/^[a-z0-9-]+$/`
- Card `_id`: UUID v4 format
- `feedId`: string, min 1 char
- `order`: integer, min 0
- `variants`: array, min 1 item
- `FULL_IMAGE.imageSrc`: valid URL (after placeholder replacement)
- `CONTENT.blocks`: array, min 1 block
- `CONTENT_TEXT.text`: min 1 char
- `CONTENT_TITLE.title`: min 1 char
- `CONTENT_QUIZ.question`: min 1 char
- `CONTENT_QUIZ.options`: array, min 2 items, exactly one `correct: true`
- `CONTENT_QUIZ.explanation`: string (always include for book quizzes)
- Feed `title`: min 1, max 200 chars
- Feed `description`: min 1, max 5000 chars
- Feed `imageSrc`: valid URL (after placeholder replacement)
- Feed `mode`: always `"sequential"`
- Feed `scrollDirection`: always `"vertical"`

---

## After Phase 3

Tell the user:

> "Content generated: {N} chapter feeds + 1 quiz feed, {N} total cards, {N} quiz questions."
> "Files: `manifests/<book-slug>.json` (with IMAGE/FORK placeholders, backgrounds resolved), `content/<book-slug>-images.md` ({N} image prompts), and `content/<book-slug>-images.html` (copy-paste table)."

### If user chose "Full image flow"

> "Now generating images via Google Flow..."

Proceed immediately to Phase 4. Do NOT wait for user confirmation.

### If user chose "Prompts only"

> "Image prompts saved to `content/<book-slug>-images.md`. Run `/generate-images` when you're ready to generate and upload images."

**Stop here.** Do NOT proceed to Phase 4 or 5. The skill is complete.

---

## Phase 4 - Image Generation (Google Flow)

This phase generates all images using Google Flow (labs.google/fx/tools/flow) via browser automation. Each image is generated as a **single variant** (1x, not 4x) to save time and quota.

### Step 1 - Browser Setup

1. Call `mcp__claude-in-chrome__tabs_create_mcp` to open a **new dedicated tab**
2. Store the returned `tabId` - use it for **ALL** subsequent browser tool calls in this phase
3. Navigate to `https://labs.google/fx/tools/flow` using the dedicated `tabId`
4. Wait for page load, take screenshot to confirm
5. Click **"+ New project"** to create a fresh project
6. Wait for the project to load

### Step 2 - Configure Settings

After the project loads, verify/change generation settings:

- **Model**: Nano Banana 2 (usually the default)
- **Count**: **x1** (click the count area and change from x4 to x1)
- **Orientation**: Square (square icon), generates at 1:1 ratio. No cropping needed.

To change settings, click the settings chip (the area showing "Nano Banana 2 x4") and adjust.

### Step 3 - Parse Image Prompts

Read the `content/<book-slug>-images.md` file. Parse out each prompt by splitting on `## ` headers (FORK, IMAGE N). Each prompt is the full text block on the line after the header (skip the blank line).

### Step 4 - Generate Each Image

**CRITICAL: Anti-detection.** Google Flow detects bot behavior and blocks sessions with a captcha redirect. Detection triggers on **rapid successive generations**, not on typing speed. The `type` action (CDP keystrokes) simulates copy-paste behavior which is normal. Long cooldowns between images are the primary defense.

For each prompt in the .md file (FORK, IMAGE 1, IMAGE 2, ... IMAGE N+1):

1. **Re-read the page** - call `read_page` with `filter: "interactive"` to get fresh textbox and submit button refs. Refs change after each generation because the DOM updates with new image thumbnails.
2. **Wait 3-5 seconds** (randomized)
3. **Click the textbox** ref to focus it
4. **Wait 2-3 seconds** (randomized)
5. **Type the prompt in 4-5 large chunks** (~800 chars each, break at sentence boundaries). Between chunks:
   - Call `computer` `type` with the chunk text
   - Call `computer` `wait` with 2-4 seconds (randomized)
   - This looks like someone copy-pasting sections from a document
6. **Wait 3-5 seconds** (randomized pause before submit)
7. **Click the submit button** ref (the arrow button immediately after the model/settings chip)
8. **Wait for completion** - poll with screenshots every 10 seconds:
   - Look for percentage indicators (e.g., "65%", "99%")
   - Image is complete when it renders without a percentage indicator
   - Typical time: 15-30 seconds per image (1x is faster than 4x)
9. **Confirm success** via screenshot
10. **Post-generation cooldown** - wait **60-90 seconds** (randomized) before starting the next prompt
11. **After every 4-5 images** - take an extra **3-5 minute** break before continuing

Total images to generate = 1 (fork cover) + N+1 (feed covers including quiz) where N = number of chapter feeds. For a typical 9-feed book, that's 11 images (~25-35 minutes total).

**Important notes:**
- **Always pass the `tabId`** from Step 1 to every browser tool call. Never omit it.
- **Re-read refs between images** - the DOM changes after each generation, invalidating old refs.
- Always use the **ref** to click the submit button, not coordinates.
- **DO NOT use `form_input`** - Google Flow uses a contenteditable div, not a form input. `form_input` will fail with "Element type DIV is not a supported form input".
- **DO NOT use JavaScript to set text** - setting textContent, innerHTML, execCommand('insertText'), or dispatching JS keyboard/paste events does not reliably update React state. The framework either rejects the prompt on submit ("Prompt must be provided") or garbles text due to React re-render interference. Only `computer` `type` (CDP/OS-level keystrokes) works.
- If an image fails ("Oops, something went wrong!"), wait 10 seconds and retry once. If it fails again, skip it and note it for the user.
- If a rate limit is hit, wait 60 seconds and retry.
- **Bot detection recovery**: If Google redirects to the homepage or shows a captcha, the session is burned. Wait 2-3 minutes, create a new project, and resume with remaining images. Generate in batches of 4-5 images per session.

### Step 5 - Report Generation Results

> "Image generation complete: {N}/{N} images rendered successfully in Google Flow."
> "Downloading and uploading to CDN..."

---

## Phase 5 - Download, Upload to CDN, and Finalize JSON

### Step 1 - Download All Images

For each generated image, download it to a local temp directory:

1. From the project grid view, **double-click** on the image to open the editor view
2. Wait for the editor to load (URL changes to include `/edit/`)
3. Use JavaScript to find the image URL and download with a custom filename:

```javascript
(async () => {
  const img = document.querySelector('img[alt="Generated image"]');
  const response = await fetch(img.src);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '<book-slug>-image-<N>.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'Downloaded: ' + a.download + ' (' + blob.size + ' bytes)';
})()
```

4. **Click the back arrow** (or navigate back) to return to the project grid view
5. Wait for the grid to reload before proceeding to the next image

Download filenames follow patterns:
- Cover images: `<book-slug>-image-1.png`, `<book-slug>-image-2.png`, etc.

Files download to the browser's default Downloads folder (typically `C:\Users\<user>\Downloads\` on Windows).

### Step 2 - Move Images to Working Directory

After downloading all images, move them to a working directory:

```bash
mkdir -p content/<book-slug>-images
mv ~/Downloads/<book-slug>-image-*.png content/<book-slug>-images/
```

Images are generated at 1:1 (square) ratio, which matches the target aspect ratio. No cropping is needed.

### Step 3 - Upload to S3

**Upload each image** to S3 using the upload script and collect CDN URLs:
```bash
# Cover images
bash scripts/upload-image.sh content/<book-slug>-images/<book-slug>-image-1.png content/<book-slug>/cover.png
bash scripts/upload-image.sh content/<book-slug>-images/<book-slug>-image-2.png content/<book-slug>/<feed-1-slug>.png
# ... etc for each cover
```

The S3 key pattern is: `content/<book-slug>/<descriptive-name>.png`
The returned CDN URLs follow the pattern: `https://{{CDN_DOMAIN}}/content/<book-slug>/<descriptive-name>.png`

2. **Collect all CDN URLs** into a mapping: `FORK` → URL, `IMAGE 1` → URL, `IMAGE 2` → URL, etc.

### Step 4 - Replace All Placeholders in JSON

Read the `manifests/<book-slug>.json` file and replace every `FORK` and `IMAGE N` placeholder with the corresponding CDN URL:

- `FORK` in `forks[].imageSrc`
- `IMAGE N` in `feeds[].imageSrc` and `cards[].variants[].imageSrc` (FULL_IMAGE cards)

Do it programmatically with Node.js for safety:
```javascript
const fs = require('fs');
const urlMap = {
  'FORK': 'https://...cover.png',
  'IMAGE 1': 'https://...feed1.png',
  'IMAGE 2': 'https://...feed2.png',
  // ... etc for all FORK and IMAGE entries
};

let json = fs.readFileSync('manifests/<book-slug>.json', 'utf8');
for (const [placeholder, url] of Object.entries(urlMap)) {
  json = json.replaceAll(placeholder, url);
}
fs.writeFileSync('manifests/<book-slug>.json', JSON.stringify(JSON.parse(json), null, 2));
```

### Step 4 - Validate Final JSON

Run a quick validation:
```bash
node -e "const j=require('fs').readFileSync('manifests/<book-slug>.json','utf8'); const d=JSON.parse(j); const bad=j.match(/\"(FORK|IMAGE) \d+\"|\"FORK\"/g); console.log('Forks:', d.forks.length, 'Feeds:', d.feeds.length, 'Cards:', d.cards.length); console.log('Remaining placeholders:', bad ? bad.join(', ') + ' (ERROR)' : 'None (OK)');"
```

If any `FORK` or `IMAGE N` placeholders remain, something went wrong - investigate and fix.

### Step 5 - Save URL Mapping

Write a reference file with all CDN URLs:
```
content/<book-slug>-urls.txt
```

Format:
```
FORK (Fork cover): https://{{CDN_DOMAIN}}/content/<book-slug>/cover.png
IMAGE 1 (Feed 1: <title>): https://{{CDN_DOMAIN}}/content/<book-slug>/<name>.png
IMAGE 2 (Feed 2: <title>): https://{{CDN_DOMAIN}}/content/<book-slug>/<name>.png
...
IMAGE N+1 (Quiz): https://{{CDN_DOMAIN}}/content/<book-slug>/<name>.png
```

---

## After Completing All Phases

Tell the user:

1. **Content**: `manifests/<book-slug>.json` - ready to upload, all image URLs resolved
2. **Images**: {N} cover images generated, downloaded, and uploaded to CDN (backgrounds sourced from pre-made catalog)
3. **Prompts**: `content/<book-slug>-images.md` - kept for reference
4. **URLs**: `content/<book-slug>-urls.txt` - CDN URL mapping
5. **Summary**: {N} chapter feeds + 1 quiz feed, {N} total cards, {N} quiz questions
6. **Next step**: "Push with `/server-actions` (Push manifests) - the JSON is ready to go."
