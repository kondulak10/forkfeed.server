import type { CardVariant } from './types.js';

// ── Generator types ──────────────────────────────────────────────

export interface GeneratedCard {
  id: string;
  variants: CardVariant[];
}

export interface GeneratorResult {
  cards: GeneratedCard[];
  hasMore: boolean;
}

export type CardGenerator = (
  feedId: string,
  page: number,
  limit: number,
) => GeneratorResult;

// ── Registry ─────────────────────────────────────────────────────

const registry = new Map<string, CardGenerator>();

export function registerGenerator(id: string, generator: CardGenerator): void {
  registry.set(id, generator);
}

export function getGenerator(id: string): CardGenerator | undefined {
  return registry.get(id);
}
