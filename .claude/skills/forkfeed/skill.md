---
name: forkfeed
description: Turn GitHub commits into swipeable forkfeed content - "The Fuck I Pushed"
user_invocable: true
---

# /forkfeed

Turn GitHub commits into swipeable forkfeed content. One fork per repo, one feed per commit, 8 cards per feed (35-62 variants). Built for "The Fuck I Pushed" - something to swipe before sleeping to see what happened in your codebase.

## Companion files

Read these files before generating content. They are the source of truth:

- **`interface.ts`** - TypeScript types for the output manifest. The generated JSON MUST conform to this interface.
- **`examples.json`** - Annotated real examples with best-practice comments. Study these patterns.
- **`connector.md`** - GitHub auth, repo resolution, commit fetching, incremental updates.
- **`formatter.md`** - The 8 card sections, block rules, image handling, tone/voice guide.

Also reference:
- **`src/types.ts`** - Content block and variant type definitions used by the server.
- **`permanent_content/it-scenes-index.md`** - IT Scenes image catalog (200 scenes + 30 backgrounds).

---

## How to use

The user says `/forkfeed` or `/forkfeed owner/repo` or `/forkfeed /path/to/local/repo`. If a repo is passed inline, skip Question 1.

The skill runs in four phases: **(1) Ask -> (2) Fetch & Analyze -> (3) Generate Content -> (4) Images & Finalize**. No phase can be skipped.

---

## Phase 1 - Ask (2-3 questions)

Ask these questions using `AskUserQuestion`, one at a time.

### Question 1 - Repository

**"Which repository should I analyze?"**

Free text. Examples: GitHub URL, shorthand (`owner/repo`), or local path. See `connector.md` for detection rules.

Skip if passed with the command.

### Question 2 - Commits

**"Which commits should I turn into feeds?"**

Options:
- **Latest commit** (Recommended)
- **Last N commits** (2-10)
- **Specific SHA(s)**
- **Since date**

Default: latest commit.

### Question 3 - Images

**"How should I handle section images?"**

Options:
- **IT Scenes** (Recommended) - pre-made ghost-themed images matched by content similarity
- **Placeholders** - picsum.photos URLs, instant but generic
- **AI-generated** - dark/neon code-themed images via Google Flow (slower)
- **Skip images** - no covers or inline images

### Hardcoded defaults (never asked)

| Parameter | Value |
|---|---|
| Sections | 8 per commit (see `formatter.md`) |
| Tone | Casual, irreverent ("The Fuck I Pushed" voice) |
| Code | Real from diff only, never fabricated (except Alternatives) |
| Mode | `sequential` |
| Scroll | `vertical` |

---

## Phase 2 - Fetch & Analyze

Follow `connector.md` for all steps in this phase.

1. **Resolve repository** - verify access, detect default branch
2. **Read project metadata** - fetch README/CLAUDE.md for fork title/description
3. **Resolve commits** - get SHAs based on user's answer, filter merge commits
4. **Extract commit data** - metadata, full diff, per-file stats, language detection
5. **Analyze diff** - structured breakdown for the 8 cards (see `formatter.md` Diff Analysis section)
6. **Check for existing manifest** - if `manifests/tfip-{owner}-{repo}.json` exists, follow the Incremental Updates flow in `connector.md`

### Report summary

Show the user before generating:

> "Analyzed commit `{shortSha}`: '{message}'"
> "{totalFiles} files changed, +{additions} -{deletions}, languages: {languages}"
> "Generating 8 cards..."

Proceed immediately. Do NOT wait for confirmation.

---

## Phase 3 - Generate Content

**Output MUST conform to `interface.ts`.** Follow `formatter.md` for all content rules. Reference `examples.json` for patterns.

### Pre-generation

Generate UUIDs for all planned cards (8 per commit, generate extras):

```bash
node -e "for(let i=0;i<N;i++) process.stdout.write(require('crypto').randomUUID()+'\n')"
```

### Output file

Write to `manifests/tfip-{owner}-{repo}.json`.

The top-level key MUST be `"forks"` (plural array). The upload script destructures `{ forks = [] }` and silently skips a singular `"fork"` key.

### Generation order

For each commit:
1. Create the feed object
2. Generate 8 cards in order (0-7), following per-section guidelines in `formatter.md`
3. Assign card UUIDs and correct `feedId` references

### Key constraints

- Fork/feed `imageSrc` = Card 0's FULL_IMAGE `imageSrc`
- Feed `title`: human-readable headline, max 60 chars (not the raw commit message)
- Feed `description`: `"<Mon DD>: <impact>"` format
- All CONTENT variants in a card share the same `backgroundSrc`
- 8 unique `backgroundSrc` values across the 8 cards
- See `formatter.md` for block patterns, tone, code snippet rules

---

## Phase 4 - Images & Finalize

Follow the Image Handling section in `formatter.md` for the user's chosen option (IT Scenes, Placeholders, AI-generated, or Skip).

### Finalize

1. **Write the JSON** to `manifests/tfip-{owner}-{repo}.json`
2. **Validate** (see checklist below)
3. **Report to user**:
   > "Generated content for {N} commit(s) from {owner}/{repo}"
   > "{N} feeds, {N} cards total"
   > "Upload with `/server-actions` (Sync only)"

---

## Validation Checklist

Run these checks before considering the JSON ready:

### ID validation
- [ ] Fork/feed `_id`: matches `/^[a-z0-9-]+$/`
- [ ] Card `_id`: valid UUID v4 format
- [ ] `feedId` on every card matches an actual feed `_id`
- [ ] `feedIds` in the fork match the actual feed `_id` values

### Structure validation
- [ ] Top-level key is `"forks"` (plural array)
- [ ] Card `order` values are sequential 0-7 within each feed
- [ ] Each card has >= 2 variants
- [ ] variant[0] is always `FULL_IMAGE` with `imageSrc`, `title`, `subtitle`
- [ ] variant[1+] are always `CONTENT` with `backgroundSrc` and `blocks`

### Field constraints
- [ ] `FULL_IMAGE.subtitle`: max 200 characters
- [ ] `CONTENT_TEXT.text`: 1+ chars
- [ ] `CONTENT_TITLE.title`: 1+ chars, sentence case
- [ ] `CONTENT_CODE.code`: 1+ chars
- [ ] `CONTENT_QUIZ.options`: exactly 4 items, exactly one `correct: true`
- [ ] `CONTENT_QUIZ.explanation`: required, 1+ chars
- [ ] Feed `title`: 1-60 chars
- [ ] Feed `mode`: `"sequential"`, `scrollDirection`: `"vertical"`, `engagement`: `true`

### Content block type safety
- [ ] Extract every unique `type` from all `blocks` arrays
- [ ] Verify each type has a matching case in the GraphQL resolver (`ContentBlock.__resolveType` in the app-server)
- [ ] Allowed types: `CONTENT_IMAGE`, `CONTENT_TEXT`, `CONTENT_TITLE`, `CONTENT_VIDEO`, `CONTENT_SOCIAL`, `CONTENT_SUBTEXT`, `CONTENT_CODE`, `CONTENT_QUIZ`, `CONTENT_BUTTON`

### Image validation (unless Skip mode)
- [ ] No placeholder text remaining (`{{CDN_DOMAIN}}`, `<scene-image>`, etc.)
- [ ] 8 unique FULL_IMAGE cover imageSrc values (one per card)
- [ ] 8 unique backgroundSrc values (one per card)
- [ ] Detail CONTENT_IMAGE differs from its card's cover imageSrc
- [ ] No ASCII-only violations (no em dashes, smart quotes)

---

## Edge Cases

- **Merge commits**: skip by default. Process only if it's the only commit.
- **Empty commits** (no changes): skip with a note to the user.
- **Binary files**: note "binary files changed" in Statistics, no diff shown.
- **Very large diffs** (>4000 lines): see `formatter.md` Large Commit Handling.
- **First commit in repo** (no parent): use `git diff --root {sha}`.
- **Private repos**: `gh` CLI handles auth if the user is logged in.
- **Monorepo commits**: group by directory/package in Statistics.
- **Commit message is just "fix"**: use diff content for feed title, fall back to short SHA + stats.
- **Commit with only deletions**: focus ELI5 on "what was removed and why".
