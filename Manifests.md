# Content

The source of truth for content is the typed TypeScript files under **`forks/`** (one
folder per fork). The legacy `manifests/*.json` files are kept only as **input for the
converter** (`npm run convert` / `scripts/manifest-to-fork.mjs`), which regenerates the
`forks/` files. See [CONTENT.md](CONTENT.md) for the authoring format.

## Forks

| Fork (`forks/<id>/`) | Description | Type |
|---|---|---|
| `atomic-habits` | Book summary - 10 feeds on tiny habits, identity change, environment design, plus a quiz | static |
| `failing-forward` | Book summary - 9 feeds on Maxwell's framework for turning failure into growth, plus a quiz | static |
| `how-to-win-friends-and-influence-people` | Book summary - 10 feeds on Carnegie's classic about relationships and trust, plus a quiz | static |
| `ostrava-guide` | Travel guide to Ostrava, Czech Republic - 7 feeds, plus a quiz | static |
| `psychology-of-money` | Book summary - 10 feeds on Housel's lessons about wealth and happiness, plus a quiz | static |
| `the-48-laws-of-power` | Book summary - 10 feeds distilling Greene's 48 laws, plus a quiz | static |
| `the-daily-stoic` | Book summary - 10 feeds of Stoic meditations, plus a quiz | static |
| `thinking-fast-and-slow` | Book summary - 10 feeds on Kahneman's two thinking systems, plus a quiz | static |
| `counting-sheep` | Infinite sleep-aid feed of jumping sheep with rare collectible variants | dynamic |

## Dynamic feeds

A dynamic feed is a `<feed-id>.dynamic.ts` file exporting a `DynamicFeed` whose
`generate(page, limit, seed)` produces cards on demand (infinite content, nothing
stored). They are bundled into the worker like any other file - there is no generator
registry.

| Feed | Source | Description |
|---|---|---|
| `counting-sheep-feed` | `forks/counting-sheep/counting-sheep-feed.dynamic.ts` (+ `sheep-data.ts`) | Infinite sleep-aid stream with deterministic rare sheep (uncommon/rare/legendary) via Knuth's multiplicative hash; card IDs derived from page+index for stability |
