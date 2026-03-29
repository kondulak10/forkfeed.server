# Manifests

## Content Manifests

| Manifest | Description | Generator |
|---|---|---|
| `atomic-habits.json` | Book summary - 10 feeds covering tiny habits, identity change, environment design, plus a quiz | - |
| `counting-sheep.json` | Infinite sleep-aid feed of sheep jumping over a fence, with rare collectible sheep variants | `counting-sheep` |
| `failing-forward.json` | Book summary - 9 feeds on John C. Maxwell's framework for turning failure into growth, plus a quiz | - |
| `how-to-win-friends-and-influence-people.json` | Book summary - 10 feeds on Dale Carnegie's classic about relationships, trust, and leadership, plus a quiz | - |
| `ostrava-guide.json` | Travel guide to Ostrava, Czech Republic - 7 feeds covering heritage, food, nightlife, nature, culture, plus a quiz | - |
| `psychology-of-money.json` | Book summary - 10 feeds on Morgan Housel's lessons about wealth, greed, and happiness, plus a quiz | - |
| `tfip-kondulak10-forkfeed-app.json` | "The Fuck I Pushed" feed for the forkfeed-app repo - GitHub commit history turned into swipeable cards | - |
| `the-48-laws-of-power.json` | Book summary - 10 feeds distilling Robert Greene's 48 laws of power and strategy, plus a quiz | - |
| `the-daily-stoic.json` | Book summary - 10 feeds on Ryan Holiday's Stoic meditations from Marcus Aurelius, Epictetus, and Seneca, plus a quiz | - |
| `thinking-fast-and-slow.json` | Book summary - 10 feeds on Kahneman's two thinking systems and cognitive biases, plus a quiz | - |

## Generators

Generators produce infinite card content dynamically. Each generator self-registers at import time in its own file, then is imported in `src/index.ts`.

| Generator | Source | Description |
|---|---|---|
| `counting-sheep` | `src/generators/counting-sheep.ts` | Infinite sleep-aid stream with deterministic rare sheep variants (uncommon/rare/legendary) using Knuth's multiplicative hash. Card IDs follow `sheep-p{page}-{index}` pattern for single-card re-derivation |
