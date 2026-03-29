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

export interface CardData {
  id: string;
  variants: CardVariant[];
}
