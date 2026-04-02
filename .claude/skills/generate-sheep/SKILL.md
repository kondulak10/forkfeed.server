---
name: generate-sheep
description: Generate the counting sheep sleep-aid feed - 3-card jump cycle with 25 rare sheep across 5 rarity tiers, image prompts, and manifest
user_invocable: true
---

# /generate-sheep

Generate the "Counting Sheep" infinite sleep-aid feed. Users swipe through sheep jumping over a fence in a 3-card flipbook cycle (approach, mid-air, landing). Rare/special sheep appear randomly with humorous titles across 5 rarity tiers (common, uncommon, rare, epic, legendary).

This is a unique generator concept, not a parameterized animal-in-setting template. The generator code (`src/generators/counting-sheep.ts` + `counting-sheep-data.ts`) is maintained separately.

## How to use

The user says `/generate-sheep`. No questions needed - the concept is fixed.

The skill runs in 2 phases: **(1) Generate Image Prompts -> (2) Generate Manifest**

---

## Context: Generator Architecture

The counting sheep generator differs from other animal generators:

- **3-card flipbook cycle**: Normal cards cycle through `JUMP_IMAGES[n % 3]` (left, mid-air, right) with no title text
- **Tiered rarity system**: Each card has a deterministic rarity check (hash % 1000):
  - 0-66: common (6.7%) - 6 sheep
  - 67-91: uncommon (2.5%) - 7 sheep
  - 92-101: rare (1.0%) - 5 sheep
  - 102-105: epic (0.4%) - 4 sheep
  - 106: legendary (0.1%) - 3 sheep
  - 107-999: normal (89.3%)
- **Rare sheep override**: When triggered, the card shows a special image + title text instead of the normal jump position
- **No quotes on normal cards**: Pure visual flipbook, counting happens in the user's head

### The 25 Rare Sheep

**Common (~1 in 15):**
1. Still Awake? - "Still not sleeping?" - stares at viewer
2. Backwards Sheep - "Wait, wrong direction" - jumping right-to-left
3. Sleepy Sheep - "Even I am getting tired" - yawning mid-jump
4. Tiny Sheep - "You almost missed me" - comically miniature
5. Chonky Sheep - "I will make it... eventually" - stuck on fence
6. Sheep with Pillow - "Brought this for you" - nightcap + pillow

**Uncommon (~1 in 40):**
7. Black Sheep - "Every flock has one"
8. Wolf in Disguise - "Definitely a sheep, keep swiping"
9. Two Stacked - "We count as two, right?"
10. Counting You - "Human #1... Human #1... Human #1..."
11. Sheep in Pajamas - "We get sleepy too"
12. Speed Sheep - "Gotta go fast"
13. Failed Jump - "Pretend you didn't see that"

**Rare (~1 in 100):**
14. Golden Sheep - "You found the golden sheep!"
15. Ghost Sheep - "Boo... now close your eyes"
16. Rainbow Sheep - "Taste the rainbow, count the sheep"
17. Buff Sheep - "Do you even count, bro?"
18. Philosopher Sheep - "If no one is awake to see me jump, do I still count?"

**Epic (~1 in 250):**
19. Astronaut Sheep - "One small step for sheep"
20. DJ Sheep - "Dropping the sleepiest beats"
21. The Shepherd - "Plot twist"
22. Ancient Sheep - "Sheep counted since 3000 BC"

**Legendary (~1 in 1000):**
23. Diamond Sheep - "Rarer than diamonds. Now sleep."
24. Invisible Sheep - "You can barely see me... your eyes are getting heavy..."
25. Mega Sheep - "I AM the fence"

---

## Phase 1 - Generate Image Prompts

Generate 30 image prompts total: 1 fork cover (full scene) + 1 background (no sheep) + 28 sheep on green screen (3 jump + 25 rare).

### Image Strategy: Separate Background + Green Screen Characters

Images are generated as **separate layers** for compositing:
- **FORK** - Full composed scene (for the fork cover only)
- **BACKGROUND** - The nighttime scene WITHOUT any sheep (hills, fence, sky, stars, moon)
- **All sheep** - Each sheep type rendered on a **solid green (#00FF00) background** for clean PNG cutout

This allows compositing any sheep over the background at any position.

### Art Style

Soft, dreamy, nighttime illustration - calming and sleep-inducing. NOT the bold abstract style used by penguin/capybara generators.

**Full scene style (fork + background):**
```
Soft dreamy cartoon illustration with a calming nighttime atmosphere, gentle
rounded shapes with smooth outlines and subtle watercolor grain texture.
Scene drawn in {SCENE_COLORS}, with soft color gradients washing across
{COLOR_SURFACES}.
```

**Green screen style (all sheep):**
```
Soft dreamy cartoon illustration, gentle rounded shapes with smooth outlines
and subtle watercolor grain texture. The background is a perfectly SOLID, FLAT,
UNIFORM BRIGHT GREEN (#00FF00) color filling the entire background with
absolutely no variation, no gradients, no textures, no environment elements,
no ground, no sky, no fence, no hills, no stars. ONLY the character on pure
solid green.
```

**Default scene colors:** deep midnight blue, soft lavender purple, warm cream white, muted sage green

**Avoid clause (green screen version):**
```
Avoid photorealism, 3D rendering, bokeh, depth of field blur, harsh saturated
neon palettes, collage cut-out aesthetic, grunge or splatter textures, neon
wireframe, vaporwave, clip-art flatness, sharp angular aggressive shapes, and
any text, letters, words, labels, numbers, signs, or written characters of any
kind. No background elements, no environment, no ground plane, no shadows on
the ground.
```

**Cutout line (append to each green screen prompt):**
```
The character has clean, well-defined edges suitable for cutout.
```

### Base Sheep Character

```
A cute round fluffy white sheep with a soft puffy wool body shaped like a cloud,
a small round head with a cream-colored face, big gentle dark sleepy eyes, a tiny
black nose, small curved ears poking through the wool, short stubby legs with dark
hooves. The sheep is simple and endearing, designed for calm repetition.
```

### Base Environment (background image only)

```
Rolling green hills in dark muted tones spread across the lower portion. A simple
white picket fence sits centered in the middle, stretching horizontally. Dark
blue-purple night sky fills the upper portion, scattered with tiny twinkling stars
and a softly glowing crescent moon. NO characters, NO animals, NO creatures.
```

### Image Categories

**FORK** - Full scene: dreamy wide shot of sheep mid-jump over fence, starry sky with large crescent moon, wildflowers, sparkle particles. Warm, inviting, cozy.

**BACKGROUND** - Full scene WITHOUT sheep: the nighttime environment only (hills, fence, sky, stars, moon). Explicitly state "no animals, no sheep, no creatures."

**IMAGES 1-3 - Jump Cycle on GREEN SCREEN**

3 sheep poses on solid green background. Each shows the same sheep in a different jump position:
1. **Approach (left)** - Sheep on LEFT side, legs bent, preparing to leap, looking upward right
2. **Mid-air (center)** - Sheep AIRBORNE centered, legs tucked, floating like a cloud
3. **Landing (right)** - Sheep on RIGHT side, front hooves extended down, back legs raised

**IMAGES 4-28 - Rare Sheep on GREEN SCREEN**

Each rare sheep on solid green background. Modify the character while keeping it isolated:
- Common sheep: subtle variations (direction, size, expression, accessories)
- Uncommon sheep: character swaps or costume changes (black wool, wolf costume, stacked pair)
- Rare sheep: material/color changes (golden, translucent, rainbow, muscular)
- Epic sheep: props and costumes (space suit, DJ booth, role reversal, Egyptian)
- Legendary sheep: extreme visual transformation (diamond crystal, nearly invisible, impossibly huge)

### Output Files

1. `content/counting-sheep-images.md` - All 30 prompts, sectioned as `## FORK`, `## BACKGROUND`, `## IMAGE 1`, etc. Include rarity tier and `[GREEN SCREEN]` tag in headers.
2. `content/counting-sheep-images.html` - Dark-themed HTML copy table:
   - Background: #1a1a2e, alternating rows with #16213e
   - Table columns: #, Label, Type (color-coded by rarity), Copy button
   - Rarity colors: common=#a3e635, uncommon=#38bdf8, rare=#fbbf24, epic=#c084fc, legendary=#f97316, bg=#6ee7b7
   - JavaScript clipboard copy with permanent "Copied!" feedback (no setTimeout revert)
   - Use safe DOM methods (createElement, textContent, addEventListener) - no innerHTML

---

## Phase 2 - Generate Manifest

Create `manifests/counting-sheep.json`:

```json
{
  "forks": [{
    "_id": "counting-sheep",
    "title": "Counting Sheep",
    "description": "Swipe through sheep jumping over a fence. Count them. Fall asleep. Watch for rare ones.",
    "imageSrc": "FORK_IMAGE_URL",
    "feedIds": ["counting-sheep-feed"]
  }],
  "feeds": [{
    "_id": "counting-sheep-feed",
    "title": "Jump, Jump, Jump",
    "description": "Infinite sheep jumping over a fence",
    "imageSrc": "FEED_IMAGE_URL",
    "mode": "random",
    "scrollDirection": "vertical",
    "engagement": true,
    "generatorId": "counting-sheep"
  }],
  "cards": []
}
```

The cards array is EMPTY - all cards come from the generator at runtime.

---

## After Generation

Tell the user:
1. Run `npm run typecheck` to verify the generator compiles
2. Deploy with `npm run deploy` to push the generator to Cloudflare Workers
3. Push the manifest: `npm run push -- manifests/counting-sheep.json`
4. Generate images from prompts (1 fork + 1 background + 3 jump + 25 rare = 30 total), upload to CDN, update `counting-sheep-data.ts` IMAGE_URLS, and redeploy

---

## File Mapping

| Concept | Path |
|---|---|
| Generator | `src/generators/counting-sheep.ts` |
| Data file | `src/generators/counting-sheep-data.ts` |
| Manifest | `manifests/counting-sheep.json` |
| Image prompts (md) | `content/counting-sheep-images.md` |
| Image prompts (html) | `content/counting-sheep-images.html` |

## Rules

- **No web research** - this is creative content, not factual
- **ASCII only** - no em dashes, smart quotes, or characters with charCode > 127
- **No em dashes or double hyphens** - use dashes, colons, or commas instead
- **3 jump images must be visually identical** except for sheep position
- **Rare sheep keep the same environment** - only the sheep character changes
- **30 images total** - 1 fork + 1 background + 3 jump (green screen) + 25 rare (green screen)
- **Green screen for all sheep** - solid #00FF00 background, no environment, clean edges for PNG cutout
- **Background rendered separately** - nighttime scene without any sheep, for compositing
- **No title on normal cards** - only rare sheep get title text overlays
