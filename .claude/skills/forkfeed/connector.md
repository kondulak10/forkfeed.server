# Connector - GitHub Auth, Fetching & Incremental Updates

How to resolve repositories, authenticate, fetch commit data, and merge new content into existing manifests.

---

## Repo Resolution

Detect the input type from the user's answer:

| Pattern | Type | Example |
|---|---|---|
| Contains `github.com` | GitHub URL | `https://github.com/vercel/next.js` |
| Contains `/` but no `\` or `:` | GitHub shorthand | `vercel/next.js` |
| Contains `\` or starts with `/` or `C:` | Local path | `C:\Users\janko\Desktop\my-project` |

---

## Authentication & Verification

### GitHub repos

Verify access and get the default branch:

```bash
# Verify access
gh api repos/{owner}/{repo} --jq '.full_name'

# Get default branch
gh api repos/{owner}/{repo} --jq '.default_branch'
```

### Local repos

```bash
# Verify it's a git repo
git -C "{path}" rev-parse --is-inside-work-tree

# Get default branch
git -C "{path}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"
```

---

## Project Metadata

Read project docs to generate a good fork title and description.

### GitHub repos

```bash
# Repo description (quick)
gh api repos/{owner}/{repo} --jq '.description'

# README (first 50 lines)
gh api repos/{owner}/{repo}/readme --jq '.content' | base64 -d | head -50

# CLAUDE.md if it exists
gh api repos/{owner}/{repo}/contents/CLAUDE.md --jq '.content' | base64 -d | head -50
```

### Local repos

```bash
cat "{path}/README.md" 2>/dev/null | head -50
cat "{path}/CLAUDE.md" 2>/dev/null | head -50
```

Use whatever you find to write:
- **Fork title**: the project's actual name (e.g., "Next.js" not "vercel/next-js")
- **Fork description**: what the project IS, sourced from README/CLAUDE.md. If nothing found, infer from the codebase

---

## Commit Resolution

Based on the user's chosen commit selection mode:

### Latest commit

```bash
# GitHub
gh api repos/{owner}/{repo}/commits?sha={branch}&per_page=1 --jq '.[0].sha'

# Local
git -C "{path}" rev-parse HEAD
```

### Last N commits

```bash
# GitHub
gh api repos/{owner}/{repo}/commits?sha={branch}&per_page={N} --jq '.[].sha'

# Local
git -C "{path}" log -{N} --format='%H'
```

### Since date

```bash
# GitHub
gh api "repos/{owner}/{repo}/commits?sha={branch}&since={iso-date}" --jq '.[].sha'

# Local
git -C "{path}" log --since="{date}" --format='%H'
```

### Specific SHAs

Use the SHAs directly as provided by the user.

### Merge commit filtering

Skip commits with more than one parent (merge commits are usually noise):

```bash
# GitHub
gh api repos/{owner}/{repo}/commits/{sha} --jq '.parents | length'

# Local
git -C "{path}" cat-file -p {sha} | grep -c '^parent'
```

If a merge commit is found, skip it silently. Exception: if it's the ONLY commit, process it anyway.

---

## Data Extraction

For each commit SHA, collect everything needed for content generation.

### GitHub repos

```bash
# Metadata
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

### Local repos

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

### Language detection

Detect languages from file extensions in the diff:

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

---

## Incremental Updates

**CRITICAL: never regenerate or modify existing commits. Never create duplicate feeds or cards.**

When the manifest file `manifests/tfip-{owner}-{repo}.json` already exists:

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
  Remove from the list
```

Only commits NOT in processedSHAs proceed to content generation.

If ALL requested commits are already processed, report "All commits already in the file, nothing to generate" and stop.

### Step 4 - Generate only new content

Generate feeds and cards ONLY for the filtered (new) commits. Follow normal generation.

### Step 5 - Merge into existing JSON

```
Forks (forks[0]):
  - Keep title, description, imageSrc, actionLabel, actionUrl UNCHANGED
  - Prepend new feed IDs to the START of feedIds[] (newest first)
  - Do NOT duplicate any feedId that already exists

Feeds:
  - Append new feed objects to feeds[]
  - Do NOT touch or overwrite any existing feed

Cards:
  - Append new card objects to cards[]
  - Do NOT touch or overwrite any existing card
  - VERIFY: no new card has a feedId matching an existing feed
```

### Step 6 - Write back

Write the merged JSON. The upload script's idempotent upsert behavior (POST + PUT on 409) handles server-side merging automatically.
