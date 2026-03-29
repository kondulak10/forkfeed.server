import { registerGenerator } from '../registry.js';
import type { CardGenerator } from '../registry.js';
import {
  NORMAL_SHEEP_IMAGE, BACKGROUND_IMAGE,
  UNCOMMON_SHEEP, RARE_SHEEP, LEGENDARY_SHEEP,
  type RareSheep,
} from './counting-sheep-data.js';
import { deterministicUuid } from './deterministic-uuid.js';

// Knuth's multiplicative hash for deterministic pseudo-random selection.
// Same page + index always yields the same card (needed for
// single-card re-derivation via the {prefix}-p{page}-{index} ID pattern).
function deterministicHash(seed: number): number {
  return ((seed * 2654435761) >>> 0);
}

// Determine if card at global position n is a rare sheep.
// Returns the rare sheep data, or null for a normal jumping sheep.
// Rarity thresholds (out of 1000):
//   0-59    uncommon  (6%)  - 21 sheep
//   60-99   rare      (4%)  - 18 sheep
//   100-119 legendary (2%)  - 6 sheep
//   120-999 normal    (88%)
function getRareSheep(n: number): { sheep: RareSheep; rarity: string } | null {
  const roll = deterministicHash(n * 7919) % 1000;

  if (roll > 119) return null;

  let tier: RareSheep[];
  let rarity: string;
  if (roll <= 59)       { tier = UNCOMMON_SHEEP; rarity = '✨ Uncommon'; }
  else if (roll <= 99)  { tier = RARE_SHEEP; rarity = '💎 Rare'; }
  else                  { tier = LEGENDARY_SHEEP; rarity = '👑 Legendary'; }

  const pick = deterministicHash(n * 13) % tier.length;
  return { sheep: tier[pick], rarity };
}

const countingSheepGenerator: CardGenerator = (_feedId, page, limit) => {
  const cards = Array.from({ length: limit }, (_, index) => {
    const n = (page - 1) * limit + index;
    const rare = getRareSheep(n);

    if (rare) {
      return {
        id: deterministicUuid(`sheep-p${page}-${index}`),
        variants: [{
          type: 'FULL_IMAGE' as const,
          imageSrc: rare.sheep.imageSrc,
          backgroundSrc: BACKGROUND_IMAGE,
          title: rare.sheep.title,
          subtitle: rare.rarity,
        }],
      };
    }

    return {
      id: deterministicUuid(`sheep-p${page}-${index}`),
      variants: [{
        type: 'FULL_IMAGE' as const,
        imageSrc: NORMAL_SHEEP_IMAGE,
        backgroundSrc: BACKGROUND_IMAGE,
      }],
    };
  });

  return { cards, hasMore: true };
};

registerGenerator('counting-sheep', countingSheepGenerator);
