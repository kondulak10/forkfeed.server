/**
 * Forkfeed Manifest Interface
 *
 * This is the source of truth for the /forkfeed skill output.
 * The generated JSON manifest MUST conform to this interface.
 *
 * Content block and variant types are defined in src/types.ts.
 * This file defines the manifest-level structure that wraps them.
 */

import type {
  CardVariant,
  CardFullImage,
  CardContent,
  ContentBlock,
  ContentBlockImage,
  ContentBlockText,
  ContentBlockTitle,
  ContentBlockSocial,
  ContentBlockSubtext,
  ContentBlockCode,
  ContentBlockQuiz,
  ContentBlockButton,
} from '../../../src/types';

// Re-export for convenience
export type { CardVariant, CardContent, CardFullImage, ContentBlock };

// ---------------------------------------------------------------------------
// Manifest top-level
// ---------------------------------------------------------------------------

/**
 * The complete manifest file shape.
 * Top-level key MUST be "forks" (plural array), never "fork" (singular).
 * The upload script destructures { forks = [] } and silently skips a singular key.
 */
export interface ForkfeedManifest {
  forks: ManifestFork[];
  feeds: ManifestFeed[];
  cards: ManifestCard[];
}

// ---------------------------------------------------------------------------
// Fork
// ---------------------------------------------------------------------------

/**
 * One fork per repo. Fork ID encodes the repo identity.
 *
 * ID pattern: `tfip-{owner}-{repo}` (GitHub) or `tfip-local-{dirname}` (local)
 * Must match: /^[a-z0-9-]+$/
 */
export interface ManifestFork {
  /** Kebab-case ID. Example: "tfip-vercel-next-js" */
  _id: string;

  /**
   * Project name from README/CLAUDE.md, NOT raw owner/repo.
   * Good: "Next.js"  Bad: "vercel/next-js"
   */
  title: string;

  /**
   * What the project IS, not what the skill is.
   * Good: "The React framework for the web."
   * Bad: "The Fuck I Pushed - review your commits before bed."
   */
  description: string;

  /** Scene image URL. Same as Card 0's FULL_IMAGE imageSrc. */
  imageSrc: string;

  /**
   * Feed IDs in order: newest commit first.
   * Each must match an actual feed._id in the feeds array.
   */
  feedIds: string[];

  /** Display label for the action button. "View on GitHub" for GitHub repos. */
  actionLabel: string;

  /** Target URL. "https://github.com/{owner}/{repo}" or "" for local repos. */
  actionUrl: string;
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

/**
 * One feed per commit.
 *
 * ID pattern: `tfip-{owner}-{repo}-{7char-sha}`
 * Must match: /^[a-z0-9-]+$/
 */
export interface ManifestFeed {
  /** Kebab-case ID encoding the 7-char SHA. Example: "tfip-vercel-next-js-abc1234" */
  _id: string;

  /**
   * Human-readable commit summary. NOT the raw commit message.
   * Write it like a short headline. Max 60 chars.
   * Good: "Feed player gets a proper ending"
   * Bad: "fix: update styles and refactor components"
   */
  title: string;

  /**
   * Date prefix + one-line description of impact.
   * Format: "<Mon DD>: <what this commit does and why it matters>"
   * Example: "Mar 26: Deleted three outdated files and fixed doc paths."
   * Max 5000 chars.
   */
  description: string;

  /** Scene image URL. Same as Card 0's FULL_IMAGE imageSrc. */
  imageSrc: string;

  /** Always "sequential" */
  mode: 'sequential';

  /** Always "vertical" */
  scrollDirection: 'vertical';

  /** Always true - enables engagement event tracking */
  engagement: true;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/**
 * One card per section (8 per feed).
 * Users scroll DOWN between cards, swipe RIGHT between variants.
 *
 * Card ID: UUID v4 format
 */
export interface ManifestCard {
  /** UUID v4. Example: "d412037b-387e-4cc5-8708-ee54734c6a16" */
  _id: string;

  /** Must match an actual feed._id */
  feedId: string;

  /**
   * Section position 0-7. Sequential within each feed.
   * 0=ELI5, 1=Roast, 2=Decoded, 3=LinkedIn, 4=Stats, 5=Learning, 6=Alternatives, 7=Quiz
   */
  order: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

  /**
   * Array of variants. Minimum 2 (cover + at least 1 detail).
   *
   * variant[0]: Always FULL_IMAGE (the cover seen when scrolling down)
   * variant[1+]: Always CONTENT (detail variants seen when swiping right)
   *
   * All CONTENT variants within a card share the same backgroundSrc.
   * Each card uses a UNIQUE backgroundSrc (no two cards in a feed share a BG).
   */
  variants: [ManifestCoverVariant, ...ManifestDetailVariant[]];
}

// ---------------------------------------------------------------------------
// Variant specializations
// ---------------------------------------------------------------------------

/**
 * variant[0] - the FULL_IMAGE cover.
 * This is what users see when scrolling down through the feed.
 */
export interface ManifestCoverVariant {
  type: 'FULL_IMAGE';

  /** Scene image URL. Must be unique across all 8 cards in the feed. */
  imageSrc: string;

  /**
   * Section name in sentence case. Max 60 chars.
   * "Explain like I'm 5" NOT "Explain Like I'm 5"
   */
  title: string;

  /**
   * Hook that makes you want to swipe right. Max 200 chars.
   * Good: "14 files and 563 lines to change how a background fades. Let's talk."
   * Bad: "See the details."
   */
  subtitle: string;
}

/**
 * variant[1+] - CONTENT detail variants.
 * These are revealed when swiping right on a card.
 */
export interface ManifestDetailVariant {
  type: 'CONTENT';

  /**
   * Background image URL. Shared across ALL detail variants within the same card.
   * Must be unique across the 8 cards in a feed (8 unique BGs per feed).
   */
  backgroundSrc: string;

  /**
   * Content blocks. See block ordering rules:
   *
   * Cards 0-1, 4-6 (standard): CONTENT_IMAGE (wide) -> CONTENT_TITLE -> ...
   * Cards 2-3 (Decoded, LinkedIn): CONTENT_SOCIAL -> CONTENT_TITLE -> ...
   * Card 5 (Learning): ... -> CONTENT_BUTTON ("Google it") as LAST block
   * Card 7 (Quiz): CONTENT_TITLE -> CONTENT_QUIZ (no CONTENT_IMAGE)
   */
  blocks: ContentBlock[];
}

// ---------------------------------------------------------------------------
// Section constants
// ---------------------------------------------------------------------------

/** The 8 sections, in order */
export const SECTIONS = [
  'Explain like I\'m 5',
  'The roast',
  'Commit message, decoded',
  'The LinkedIn post',
  'Statistics',
  'Learning moment',
  'Alternatives',
  'Quiz',
] as const;

export type SectionName = (typeof SECTIONS)[number];

/** Expected variant counts per section (cover + detail) */
export const VARIANT_COUNTS: Record<SectionName, { min: number; max: number }> = {
  'Explain like I\'m 5':        { min: 4, max: 7 },
  'The roast':                   { min: 4, max: 7 },
  'Commit message, decoded':     { min: 3, max: 5 },
  'The LinkedIn post':           { min: 3, max: 5 },
  'Statistics':                  { min: 4, max: 6 },
  'Learning moment':             { min: 4, max: 9 },
  'Alternatives':                { min: 4, max: 7 },
  'Quiz':                        { min: 11, max: 16 },
};
