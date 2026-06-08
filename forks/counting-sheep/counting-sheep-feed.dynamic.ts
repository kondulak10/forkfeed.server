import type { DynamicFeed, Card } from '../../src/types.js';
import {
  NORMAL_SHEEP_IMAGE, BACKGROUND_IMAGE,
  UNCOMMON_SHEEP, RARE_SHEEP, LEGENDARY_SHEEP,
  type RareSheep,
} from './sheep-data.js';

// Knuth's multiplicative hash for deterministic pseudo-random selection.
// Same global position always yields the same card.
function deterministicHash(seed: number): number {
  return (seed * 2654435761) >>> 0;
}

// FNV-1a based deterministic UUID v4 from a string seed (stable ids).
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function deterministicUuid(seed: string): string {
  const h = [fnv1a(seed + '\x00'), fnv1a(seed + '\x01'), fnv1a(seed + '\x02'), fnv1a(seed + '\x03')];
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 4; i++) {
    bytes[i * 4] = (h[i] >>> 24) & 0xff;
    bytes[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    bytes[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    bytes[i * 4 + 3] = h[i] & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Determine if the card at global position n is a rare sheep.
// Rarity thresholds (out of 1000):
//   0-59    uncommon  (6%)
//   60-99   rare      (4%)
//   100-119 legendary (2%)
//   120-999 normal    (88%)
function getRareSheep(n: number): { sheep: RareSheep; rarity: string } | null {
  const roll = deterministicHash(n * 7919) % 1000;
  if (roll > 119) return null;

  let tier: RareSheep[];
  let rarity: string;
  if (roll <= 59) { tier = UNCOMMON_SHEEP; rarity = '✨ Uncommon'; }
  else if (roll <= 99) { tier = RARE_SHEEP; rarity = '💎 Rare'; }
  else { tier = LEGENDARY_SHEEP; rarity = '👑 Legendary'; }

  // An empty tier would make `% tier.length` NaN -> tier[NaN] undefined -> crash.
  // Fall back to a normal sheep if a forker empties a tier.
  if (tier.length === 0) return null;

  const pick = deterministicHash(n * 13) % tier.length;
  return { sheep: tier[pick], rarity };
}

const feed: DynamicFeed = {
  id: 'counting-sheep-feed',
  title: 'Sheep, Sheep, Sheep...',
  description: 'Infinite sheep to help you fall asleep',
  imageSrc: 'https://d5rfy0lpah1cz.cloudfront.net/content/counting-sheep/fork.jpg',
  mode: 'random',
  scrollDirection: 'horizontal',
  engagement: true,
  dynamic: true,
  generate(page, limit) {
    const cards: Card[] = Array.from({ length: limit }, (_, index) => {
      const n = (page - 1) * limit + index;
      const rare = getRareSheep(n);
      const id = deterministicUuid(`sheep-p${page}-${index}`);
      if (rare) {
        return {
          id,
          variants: [{
            type: 'FULL_IMAGE',
            imageSrc: rare.sheep.imageSrc,
            backgroundSrc: BACKGROUND_IMAGE,
            title: rare.sheep.title,
            subtitle: rare.rarity,
          }],
        };
      }
      return {
        id,
        variants: [{ type: 'FULL_IMAGE', imageSrc: NORMAL_SHEEP_IMAGE, backgroundSrc: BACKGROUND_IMAGE }],
      };
    });
    return { cards, hasMore: true };
  },
};

export default feed;
