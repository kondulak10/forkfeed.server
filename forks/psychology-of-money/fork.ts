import type { Fork } from '../../src/types.js';
import feed0 from './psychology-of-money-your-money-story.js';
import feed1 from './psychology-of-money-never-enough.js';
import feed2 from './psychology-of-money-the-magic-of-compounding.js';
import feed3 from './psychology-of-money-tails-and-freedom.js';
import feed4 from './psychology-of-money-the-invisible-wealth.js';
import feed5 from './psychology-of-money-the-art-of-saving.js';
import feed6 from './psychology-of-money-planning-for-chaos.js';
import feed7 from './psychology-of-money-the-price-of-returns.js';
import feed8 from './psychology-of-money-stories-we-tell-ourselves.js';
import feed9 from './psychology-of-money-quiz.js';

const fork: Fork = {
  meta: {
    "id": "psychology-of-money",
    "title": "The Psychology of Money",
    "description": "Timeless lessons on wealth, greed, and happiness from Morgan Housel's bestselling exploration of how we think about money.\n\nAll rights belong to the author and publisher. This is a summary/review, buy the book below from the author.",
    "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/psychology-of-money/fork_202603272103.jpeg",
    "actionLabel": "Buy the book",
    "actionUrl": "https://www.amazon.com/s?k=The+Psychology+of+Money+Morgan+Housel"
  },
  feeds: [feed0, feed1, feed2, feed3, feed4, feed5, feed6, feed7, feed8, feed9],
};

export default fork;
