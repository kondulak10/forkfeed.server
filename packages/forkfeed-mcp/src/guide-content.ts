/**
 * Condensed skill guide for generating forkfeed content from GitHub commits.
 * Returned by the forkfeed_guide tool. This is the single-read reference
 * that teaches Claude how to generate a valid manifest.
 */
export const GUIDE_CONTENT = `
# Forkfeed Content Guide - "The Fuck I Pushed"

Turn GitHub commits into swipeable card content. One fork per repo, one feed per commit, 8 cards per feed (35-62 variants total).

## Quick start

1. Ask which repo and commits to process
2. Fetch commit data via git or gh CLI
3. Generate 8-card manifest JSON
4. Call forkfeed_push with the manifest

---

## Phase 1: Resolve repo and commits

Use the **current working directory** as the repo. Do not ask which repo.

If the user didn't specify commits, use the latest commit. Otherwise respect what they asked (last N, specific SHA, since date).

Use **IT Scenes** images. Call **forkfeed_images** to get the full catalog (200 scene images + 30 backgrounds). Match images to content by tags and semantic similarity. Do not ask about image style.

---

## Phase 2: Fetch commit data

### GitHub repos
\`\`\`bash
# Verify access
gh api repos/{owner}/{repo} --jq '.full_name'

# Metadata
gh api repos/{owner}/{repo}/commits/{sha} --jq '{sha: .sha, shortSha: (.sha[:7]), message: .commit.message, author: .commit.author.name, date: .commit.author.date, additions: .stats.additions, deletions: .stats.deletions, totalFiles: (.files | length)}'

# Full diff
gh api repos/{owner}/{repo}/commits/{sha} -H "Accept: application/vnd.github.v3.diff"

# README for fork title/description
gh api repos/{owner}/{repo} --jq '.description'
\`\`\`

### Local repos
\`\`\`bash
git -C "{path}" log -1 --format='{"sha":"%H","shortSha":"%h","message":"%s","author":"%an","date":"%aI"}' {sha}
git -C "{path}" diff --stat {sha}^..{sha}
git -C "{path}" diff {sha}^..{sha}
\`\`\`

Skip merge commits (>1 parent) unless it's the only commit.

---

## Phase 3: Generate manifest

### ID conventions
- Fork: \`tfip-{owner}-{repo}\` or \`tfip-local-{dirname}\`
- Feed: \`tfip-{owner}-{repo}-{7char-sha}\`
- Card: UUID v4 (generate upfront with \`node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\\n')"\`)

All IDs must match \`/^[a-z0-9-]+$/\` (except card UUIDs).

### JSON structure
\`\`\`json
{
  "forks": [{
    "_id": "tfip-owner-repo",
    "title": "Project Name (from README)",
    "description": "What the project IS",
    "imageSrc": "same as card 0 cover image",
    "feedIds": ["tfip-owner-repo-abc1234"],
    "actionLabel": "View on GitHub",
    "actionUrl": "https://github.com/owner/repo"
  }],
  "feeds": [{
    "_id": "tfip-owner-repo-abc1234",
    "title": "Human-readable headline (max 60 chars)",
    "description": "Mon DD: one-line impact summary",
    "imageSrc": "same as card 0 cover image",
    "mode": "sequential",
    "scrollDirection": "vertical",
    "engagement": true
  }],
  "cards": [
    {
      "_id": "uuid-v4",
      "feedId": "tfip-owner-repo-abc1234",
      "order": 0,
      "variants": [
        { "type": "FULL_IMAGE", "imageSrc": "url", "title": "Section name", "subtitle": "Hook text (max 200 chars)" },
        { "type": "CONTENT", "backgroundSrc": "url", "blocks": [...] }
      ]
    }
  ]
}
\`\`\`

### The 8 cards (sections)

Each card: variant[0] = FULL_IMAGE cover, variant[1+] = CONTENT details.

| # | Section | Detail variants | Block pattern | Tone |
|---|---------|----------------|---------------|------|
| 0 | Explain like I'm 5 | 3-6 | IMAGE(wide) -> TITLE -> TEXT | Playful, zero jargon |
| 1 | The roast | 3-6 | IMAGE(wide) -> TITLE -> TEXT, optional SUBTEXT | Maximum cheekiness, swearing ok |
| 2 | Commit message, decoded | 2-4 | SOCIAL -> TITLE -> TEXT -> optional CODE | Escalating absurdity |
| 3 | The LinkedIn post | 2-4 | SOCIAL -> TITLE -> TEXT -> SUBTEXT | Peak LinkedIn parody |
| 4 | Statistics | 3-5 | IMAGE(wide) -> TITLE -> CODE | Deadpan data humor |
| 5 | Learning moment | 3-8 | IMAGE(wide) -> TITLE -> TEXT -> optional CODE -> BUTTON(last) | Teach with personality |
| 6 | Alternatives | 3-6 | IMAGE(wide) -> TITLE -> TEXT -> optional CODE | Constructive snark |
| 7 | Quiz | 10-15 | TITLE -> QUIZ (no IMAGE) | Quiz show energy |

### Content block types

\`\`\`typescript
// CONTENT_IMAGE - inline image
{ type: "CONTENT_IMAGE", imageSrc: "url", sizing: "wide" }

// CONTENT_TITLE - section heading (required in every detail variant, sentence case)
{ type: "CONTENT_TITLE", title: "Feature detection pattern" }

// CONTENT_TEXT - paragraph (50-200 words, use \\n\\n for breaks)
{ type: "CONTENT_TEXT", text: "..." }

// CONTENT_CODE - code snippet (real from diff, 5-20 lines, strip +/- prefixes)
{ type: "CONTENT_CODE", code: "...", language: "typescript" }

// CONTENT_SOCIAL - persona post (Cards 2-3 only, replaces IMAGE)
{ type: "CONTENT_SOCIAL", avatarSrc: "url", name: "Chad Gitpush", subtitle: "10x Engineer", source: "linkedin" }

// CONTENT_SUBTEXT - aside or protip
{ type: "CONTENT_SUBTEXT", text: "..." }

// CONTENT_QUIZ - quiz question (Card 7 only, exactly 4 options, one correct)
{ type: "CONTENT_QUIZ", question: "...", options: [{ label: "A", correct: false }, ...], explanation: "..." }

// CONTENT_BUTTON - action button (Card 5 only, MUST be last block)
{ type: "CONTENT_BUTTON", label: "Google it", action: "url", target: "https://www.google.com/search?q=topic+here" }
\`\`\`

### Card 2 personas (Decoded)
- "What you meant" (source: "x" or "threads")
- "Corporate speak" (source: "linkedin")
- Optional: "Shakespearean" (source: "x"), "Military briefing" (source: "x")

### Card 3 personas (LinkedIn)
- Chad Gitpush: "10x Engineer | Building in Public | DMs Open"
- Alexandra Middleware: "VP of Forward Thinking at TechCorp"
- Dave 'Shipping' Johnson: "Just a humble engineer doing humble things"

### Key rules
- All CONTENT variants in a card share the same backgroundSrc
- 8 unique backgroundSrc values across the 8 cards
- 8 unique FULL_IMAGE cover imageSrc values
- Cards 0-5: code must be REAL from the diff (never fabricated)
- Card 6: synthesized code IS allowed
- Card 7: no code blocks, no CONTENT_IMAGE
- Card 5: every detail variant MUST end with CONTENT_BUTTON
- CONTENT_QUIZ: exactly 4 options, exactly one correct: true, explanation required
- No em dashes, smart quotes, or non-ASCII characters
- Top-level key MUST be "forks" (plural array)

### IT Scenes images

Call **forkfeed_images** to get the full catalog. 200 scene images (img1-img200) for covers and inline images, 30 backgrounds (bg1-bg30) for card backgrounds.

**Matching rules:**
1. Identify commit tags from the diff: deploy, git, disaster, debug, hype, victory, beginner, language, lifestyle, workplace, sarcastic, general
2. Filter images by tag overlap
3. Rank by semantic similarity to card content (title, text, code topics)
4. Assign best match, remove from pool (no duplicates)

**Uniqueness rules:**
- 8 unique scene images for FULL_IMAGE covers (one per card)
- Detail CONTENT_IMAGE must differ from the card's cover
- No two detail variants in the same card share a CONTENT_IMAGE
- 8 unique bg* images for backgroundSrc (one per card)
- Pick 16-25 unique images per feed

**BG preferences per section:**
- ELI5 (0): bg10, bg27 | Roast (1): bg11, bg1 | Decoded (2): bg20, bg11
- LinkedIn (3): bg25, bg24 | Statistics (4): bg9, bg3 | Learning (5): match tech
- Alternatives (6): bg25, bg30 | Quiz (7): bg18, bg5

**Fork/feed imageSrc** = Card 0's FULL_IMAGE imageSrc

### Tone
Casual, cheeky, technically accurate. Like your funniest friend reviewing your code.
- Use "you" directly
- Short paragraphs
- Contractions
- Swear occasionally for emphasis
- Humor is the default

### Incremental updates
If the user has pushed before (check with forkfeed_status), generate only NEW feeds/cards. Prepend new feed IDs to the fork's feedIds array. Never regenerate existing commits.

---

## Phase 4: Push

After generating the manifest JSON, call the **forkfeed_push** tool with it:
\`\`\`
forkfeed_push({ manifest: { forks: [...], feeds: [...], cards: [...] } })
\`\`\`

Content starts as **private**. The user can make it public from the forkfeed mobile app (requires admin approval).

---

## Validation checklist (verify before pushing)

- [ ] Fork/feed IDs match /^[a-z0-9-]+$/
- [ ] Card IDs are valid UUID v4
- [ ] Every card.feedId matches an actual feed._id
- [ ] Fork.feedIds match actual feed._id values
- [ ] Top-level key is "forks" (plural array)
- [ ] Card order values are sequential 0-7
- [ ] Each card has >= 2 variants
- [ ] variant[0] is FULL_IMAGE with imageSrc, title, subtitle
- [ ] variant[1+] are CONTENT with backgroundSrc and blocks
- [ ] FULL_IMAGE subtitle max 200 chars
- [ ] Feed title max 60 chars
- [ ] Feed mode: "sequential", scrollDirection: "vertical", engagement: true
- [ ] CONTENT_QUIZ: exactly 4 options, one correct, explanation required
- [ ] Card 5 detail variants end with CONTENT_BUTTON
- [ ] 8 unique cover images, 8 unique backgrounds
- [ ] No em dashes or smart quotes
`.trim();
