---
description: Turn a git commit in the current repo into a swipeable 6-card forkfeed feed and publish it (unlisted, shareable by link) to forkfeed.link. No login or token.
argument-hint: "[commit sha or leave blank to pick]"
allowed-tools: Bash(node:*), Write, AskUserQuestion
---

Turn a commit in this repo into forkfeed content, then publish it to the user's
forkfeed account. Follow the `forkfeed-content` skill for the card format and
rules. Steps:

1. List recent commits:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/forkfeed.mjs" commits`
   Show the table. If the user passed a sha in `$ARGUMENTS`, use it. Otherwise ask
   which ONE commit to turn into content. One commit at a time, never multiple. Do
   NOT ask about image style.

2. Get the diff + suggested scene images for the chosen commit:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/forkfeed.mjs" suggest --sha <sha>`

3. Read the repo's root context docs (README.md and any CONTRIBUTING / ARCHITECTURE
   / docs guides at the repo root) for project context, then generate the simplified
   content JSON following the `forkfeed-content` skill:
   `sha`, `feedTitle`, `feedDescription`, `forkTitle`, `forkDescription`, and
   exactly 6 `cards` (each `{ variants: [ { blocks: [...] } ] }`). Use short image
   ids (e.g. `img47`) from the suggest output. Do NOT include owner, repo,
   backgrounds, ids, covers, or type wrappers, the publish script generates all of
   that. Write the JSON to a temporary file (for example in the system temp dir).

4. Preview, then publish:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/forkfeed.mjs" publish --file <tmp.json> --dry-run`
   to validate the assembled payload, then run the same command without
   `--dry-run` to publish. No token, no login, nothing to install: it publishes
   anonymously and unlisted (shareable by link).

5. Report the result to the user IN YOUR REPLY, in this exact order:
   - the line `Open it: <url>` (the URL the publish script printed), then
   - the **entire QR code** the publish script printed, reproduced **verbatim
     inside a fenced code block** (```), copied character-for-character from the
     command output. This is mandatory: do NOT summarize it, describe it, redraw it,
     say "scan the QR above", or omit any rows. The QR must be visible as text in
     your reply so the user can scan it on screen.
   - one short line: the content is unlisted (anyone with the link can view it, not
     shown in discovery) and each run makes a fresh link.
