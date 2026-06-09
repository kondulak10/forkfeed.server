# Forkfeed plugin

Turn your git commits into swipeable forkfeed content, straight from Claude Code.
This is a Claude Code **plugin** (a `/forkfeed` slash command + an authoring skill
+ one zero-dependency Node script).

It is **tokenless**: no login, no secrets, nothing to install beyond the plugin.
Content publishes anonymously to forkfeed.link as an **unlisted** feed (viewable by
anyone with the link, never shown in discovery). After publishing it prints a **QR
code** that opens the feed straight in the Forkfeed app on your phone.

## Prerequisites

- Git (a repo with commits)
- [Claude Code](https://claude.com/claude-code)
- Node 18+

## Step 1: Install the plugin

```
/plugin marketplace add kondulak10/forkfeed.server
/plugin install forkfeed@forkfeed
```

(`/plugin marketplace add` also accepts a git URL or a marketplace.json URL.)

## Step 2: Generate content from a commit

In any git repo:

```
/forkfeed
```

or just ask:

```
> turn my latest commit into forkfeed content
```

Claude lists your recent commits, asks which one, reads the repo's README + the
commit diff, generates 6 swipeable cards, previews the payload, and publishes it.
It prints a link and a QR code; scan the QR to open the feed in the app.

## How it works

```
Your Claude Code session
  |
  |-- scripts/forkfeed.mjs commits   --> lists recent commits (git)
  |-- scripts/forkfeed.mjs suggest   --> commit diff + suggested scene images
  |-- you read repo docs + generate 6 cards (forkfeed-content skill)
  |-- scripts/forkfeed.mjs publish   --> POST /api/content/publish-native (no token)
        |
        app-server stores Fork + Feed + Cards (unlisted) in its own DB
        |
        returns a /watch/<feedId> link + QR; scanning opens the app on that feed
```

## The 6 cards

Each commit becomes one feed of exactly 6 cards: Explain Like I'm 5, The Roast,
The LinkedIn Post, Learning Moment, Alternatives, and a Quiz. See the
`forkfeed-content` skill (`skills/forkfeed-content/SKILL.md`) for the full format.

## Visibility

Content is **unlisted**: anyone with the link/QR can view it, but it never appears
in discovery or search. Each publish creates a fresh link. Old anonymous content is
cleaned up automatically after a retention window.

## Images

Cards reference a built-in catalog of developer-themed images by short id
(`img1`-`img200`, `bg1`-`bg30`); the publish script resolves them to CDN urls and
stores those urls on the card. You can also pass a full `http(s)` image url.

## Tools (the bundled script)

| Command | What it does |
|---|---|
| `forkfeed.mjs commits` | Lists recent commits in the repo |
| `forkfeed.mjs suggest --sha <sha>` | Commit diff, stats, and suggested scene images |
| `forkfeed.mjs publish --file <json> [--dry-run]` | Builds + validates the payload, then publishes (or previews) |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `/forkfeed` not found | Re-check `/plugin install`, then `/plugin` to confirm it is enabled |
| "Unknown image ID" | Use ids from the `suggest` output (img1-img200, bg1-bg30) or a full url |
| "Not in a git repo" | Run inside a git repository with commits |
| QR opens the web, not the app | The app must be installed; otherwise the link sends you to the App Store |
| Publish failed | Check your network; the app-server is at `https://api.forkfeed.link` (override with `APP_SERVER_URL`) |

## For maintainers

This plugin lives in the public `forkfeed.server` repo so it can be installed via
`/plugin marketplace add kondulak10/forkfeed.server` (repo-root
`.claude-plugin/marketplace.json`, `source: "./forkfeed-plugin"`). The app-native
backend (the `/api/content/publish-native` endpoint, Card storage, the `/watch`
deep link) lives in the private `forkfeed-app` repo.
