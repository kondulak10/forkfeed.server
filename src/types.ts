// Content Block types
export type ImageSizing = 'automatic' | 'wide' | 'portrait' | 'square' | 'small_portrait';

export type ContentBlockImage = {
  type: 'CONTENT_IMAGE';
  imageSrc: string;
  alt?: string;
  sizing: ImageSizing;
};

export type ContentBlockText = {
  type: 'CONTENT_TEXT';
  text: string;
};

export type ContentBlockTitle = {
  type: 'CONTENT_TITLE';
  title: string;
  subtitle?: string;
};

export type ContentBlockVideo = {
  type: 'CONTENT_VIDEO';
  videoSrc: string;
  posterSrc?: string;
};

export type SocialSource = 'x' | 'linkedin' | 'instagram' | 'facebook' | 'threads' | 'bluesky';

export type ContentBlockSocial = {
  type: 'CONTENT_SOCIAL';
  avatarSrc: string;
  name: string;
  subtitle?: string;
  source: SocialSource;
};

export type ContentBlockSubtext = {
  type: 'CONTENT_SUBTEXT';
  text: string;
};

export type ContentBlockCode = {
  type: 'CONTENT_CODE';
  code: string;
  language?: string;
};

export type QuizOption = {
  label: string;
  correct: boolean;
};

export type ContentBlockQuiz = {
  type: 'CONTENT_QUIZ';
  question: string;
  options: QuizOption[];
  explanation?: string;
};

export type ContentBlockButton = {
  type: 'CONTENT_BUTTON';
  label: string;
  action: 'url' | 'fork' | 'feed' | 'user';
  target: string;
};

export type ContentBlock =
  | ContentBlockImage
  | ContentBlockText
  | ContentBlockTitle
  | ContentBlockVideo
  | ContentBlockSocial
  | ContentBlockSubtext
  | ContentBlockCode
  | ContentBlockQuiz
  | ContentBlockButton;

// Card Variant types
export type CardFullImage = {
  type: 'FULL_IMAGE';
  imageSrc: string;
  backgroundSrc?: string;
  title?: string;
  subtitle?: string;
};

export type CardFullVideo = {
  type: 'FULL_VIDEO';
  videoSrc: string;
  posterSrc?: string;
  title?: string;
};

export type CardContent = {
  type: 'CONTENT';
  blocks: ContentBlock[];
  backgroundSrc?: string;
};

export type CardVariant = CardFullImage | CardFullVideo | CardContent;

// A single card: an id plus one or more swipeable variants.
export interface Card {
  id: string;
  variants: CardVariant[];
}

// ── Feed / Fork model (files-based) ──────────────────────────────
//
// Content lives as typed TS objects under `forks/`. Wrangler bundles
// these into the worker at build time, so the typed objects ARE the
// runtime data: no database, no JSON-serving layer. Dynamic feeds are
// just functions that ship in the bundle.

export type FeedMode = 'sequential' | 'random';
export type ScrollDirection = 'vertical' | 'horizontal';

// Metadata shared by every feed, static or dynamic.
export interface FeedMeta {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  /** default: 'sequential' */
  mode?: FeedMode;
  /** default: 'vertical' */
  scrollDirection?: ScrollDirection;
  /** opt-in engagement tracking (collected by the app-server) */
  engagement?: boolean;
}

// A page produced by a dynamic feed's generate().
export interface GeneratedPage {
  cards: Card[];
  hasMore: boolean;
}

// Static feed: a fixed, ordered array of cards in the file.
export interface StaticFeed extends FeedMeta {
  cards: Card[];
}

// Dynamic feed: a generator. To add infinite/dynamic content, drop a
// `<feed-id>.dynamic.ts` file in a fork's `feeds/` folder.
export interface DynamicFeed extends FeedMeta {
  dynamic: true;
  /**
   * Produce one page of cards. `seed` equals the page number, so the same page
   * always yields the same cards (stable, non-repeating infinite scroll). Give
   * generated cards deterministic ids derived from page+index.
   */
  generate: (page: number, limit: number, seed: number) => GeneratedPage;
}

export type Feed = StaticFeed | DynamicFeed;

export interface ForkMeta {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  /** optional CTA button surfaced by the app */
  actionLabel?: string;
  actionUrl?: string;
}

// A fork is metadata plus its ordered feeds. One per `forks/<id>/fork.ts`.
export interface Fork {
  meta: ForkMeta;
  feeds: Feed[];
}

export function isDynamicFeed(feed: Feed): feed is DynamicFeed {
  return (feed as DynamicFeed).dynamic === true;
}
